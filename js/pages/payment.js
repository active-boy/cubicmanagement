// 收费页面逻辑 - 模拟支付版本
(function() {
    'use strict';

    let currentReservation = null;
    let currentPayment = null;
    let currentStep = 1;

    // 初始化
    document.addEventListener('DOMContentLoaded', async () => {
        await loadReservationData();
        displayOrderInfo();
    });

    // 加载预约数据
    async function loadReservationData() {
        // 先从临时存储获取
        const pendingReservation = sessionStorage.getItem('pendingReservation');
        if (pendingReservation) {
            currentReservation = JSON.parse(pendingReservation);
        }
        
        // 如果没有，从URL参数获取
        if (!currentReservation) {
            const params = new URLSearchParams(window.location.search);
            const reservationId = params.get('reservationId');
            if (reservationId && window.ReservationAPI) {
                currentReservation = await window.ReservationAPI.getReservationById(parseInt(reservationId));
            }
        }
        
        // 如果还是没有，从取车页面传来的超时支付
        const overtimeData = sessionStorage.getItem('overtimePayment');
        if (overtimeData && !currentReservation) {
            const data = JSON.parse(overtimeData);
            currentReservation = data.reservation;
            window.overtimeInfo = data.overtimeInfo;
        }
        
        if (!currentReservation) {
            showMessage('未找到预约信息', 'error');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
        }
    }

    // 显示订单信息
    function displayOrderInfo() {
        if (!currentReservation) return;
        
        const startTime = new Date(currentReservation.startTime);
        const endTime = new Date(currentReservation.endTime);
        const duration = (endTime - startTime) / (1000 * 60 * 60);
        
        // 检查是否有超时信息
        const isOvertime = window.overtimeInfo && window.overtimeInfo.hasOvertime;
        const totalAmount = isOvertime ? window.overtimeInfo.fee : (currentReservation.fee || Math.ceil(duration) * 5);
        
        document.getElementById('orderId').textContent = currentReservation.orderId || '生成中...';
        document.getElementById('phoneNumber').textContent = maskPhone(currentReservation.phoneNumber);
        document.getElementById('location').textContent = `${currentReservation.garage}区 ${currentReservation.level}层 ${currentReservation.spotNumber}号`;
        document.getElementById('timeRange').textContent = `${formatDateTime(startTime)} - ${formatDateTime(endTime)}`;
        document.getElementById('duration').textContent = `${duration.toFixed(1)} 小时`;
        document.getElementById('totalAmount').textContent = `¥${totalAmount}`;
        
        // 保存金额供后续使用
        sessionStorage.setItem('paymentAmount', totalAmount);
        
        // 如果是超时支付，显示超时说明
        if (isOvertime && window.overtimeInfo) {
            const orderInfoDiv = document.querySelector('.order-info');
            const overtimeHtml = `
                <div class="info-row overtime-row" style="color: #ff4757;">
                    <span class="info-label">超时说明：</span>
                    <span class="info-value">超时 ${window.overtimeInfo.hours} 小时，费用 ¥${window.overtimeInfo.fee}</span>
                </div>
            `;
            const totalRow = orderInfoDiv.querySelector('.total-row');
            if (totalRow) {
                totalRow.insertAdjacentHTML('beforebegin', overtimeHtml);
            }
        }
    }

    // 前往步骤2
    window.goToPaymentStep2 = function() {
        showPaymentStep(2);
    };

    // 前往步骤1
    window.goToPaymentStep1 = function() {
        showPaymentStep(1);
    };

    // 模拟支付处理 - 直接成功
    window.processPayment = async function() {
        const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked');
        if (!selectedMethod) {
            showMessage('请选择支付方式', 'warning');
            return;
        }
        
        const paymentMethod = selectedMethod.value;
        const totalAmount = parseInt(sessionStorage.getItem('paymentAmount') || '0');
        
        // 显示加载状态
        const confirmBtn = document.querySelector('.confirm-payment-btn');
        const originalText = confirmBtn.textContent;
        confirmBtn.textContent = '处理中...';
        confirmBtn.disabled = true;
        
        // 模拟支付延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
            // 模拟支付成功
            const transactionId = 'TXN' + Date.now() + Math.floor(Math.random() * 10000);
            
            // 创建模拟支付记录
            currentPayment = {
                id: Date.now(),
                reservationId: currentReservation.id,
                amount: totalAmount,
                paymentMethod: paymentMethod,
                transactionId: transactionId,
                paidAt: new Date().toISOString()
            };
            
            // 更新预约状态为已支付
            if (currentReservation.id && window.ReservationAPI) {
                await window.ReservationAPI.updateReservationStatus(currentReservation.id, 'paid');
            }
            
            // 保存支付记录到本地
            const payments = JSON.parse(localStorage.getItem('parking_payments') || '[]');
            payments.push(currentPayment);
            localStorage.setItem('parking_payments', JSON.stringify(payments));
            
            // 显示成功页面
            showPaymentStep(3);
            showPaymentSuccess(transactionId);
            
            // 清除临时数据
            sessionStorage.removeItem('pendingReservation');
            sessionStorage.removeItem('overtimePayment');
            delete window.overtimeInfo;
            
        } catch (error) {
            console.error('支付处理失败:', error);
            showMessage('支付处理失败，请重试', 'error');
        } finally {
            confirmBtn.textContent = originalText;
            confirmBtn.disabled = false;
        }
    };

    // 显示支付成功信息
    function showPaymentSuccess(transactionId) {
        const amount = sessionStorage.getItem('paymentAmount') || '0';
        
        document.getElementById('successOrderId').textContent = currentReservation.orderId || '生成中...';
        document.getElementById('successLocation').textContent = `${currentReservation.garage}区 ${currentReservation.level}层 ${currentReservation.spotNumber}号`;
        document.getElementById('successAmount').textContent = `¥${amount}`;
        
        // 显示交易号
        const transactionSpan = document.getElementById('successTransactionId');
        if (transactionSpan) {
            transactionSpan.textContent = transactionId;
        }
    }

    // 切换支付步骤
    function showPaymentStep(step) {
        currentStep = step;
        
        for (let i = 1; i <= 3; i++) {
            const content = document.getElementById(`step${i}Content`);
            if (content) content.style.display = 'none';
            const stepEl = document.getElementById(`step${i}`);
            if (stepEl) {
                if (i < step) {
                    stepEl.classList.add('completed');
                    stepEl.classList.remove('active');
                } else if (i === step) {
                    stepEl.classList.add('active');
                    stepEl.classList.remove('completed');
                } else {
                    stepEl.classList.remove('active', 'completed');
                }
            }
        }
        
        const currentContent = document.getElementById(`step${step}Content`);
        if (currentContent) currentContent.style.display = 'block';
    }
    
    // 辅助函数
    function maskPhone(phone) {
        if (!phone || phone.length !== 11) return phone;
        return phone.substring(0, 3) + '****' + phone.substring(7);
    }
    
    function formatDateTime(date) {
        return `${date.getMonth()+1}/${date.getDate()} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
    }
})();