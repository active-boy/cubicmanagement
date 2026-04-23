// 取车页面逻辑
(function() {
    'use strict';

    let currentReservation = null;
    let currentSearchMethod = 'phone';

    // 初始化
    document.addEventListener('DOMContentLoaded', () => {
        bindMethodButtons();
    });

    // 绑定查询方式按钮
    function bindMethodButtons() {
        const methodBtns = document.querySelectorAll('.method-btn');
        methodBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const method = btn.getAttribute('data-method');
                switchSearchMethod(method);
            });
        });
    }

    // 切换查询方式
    function switchSearchMethod(method) {
        currentSearchMethod = method;
        
        // 更新按钮样式
        document.querySelectorAll('.method-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.method-btn[data-method="${method}"]`).classList.add('active');
        
        // 切换表单显示
        const phoneSearch = document.getElementById('phoneSearch');
        const orderSearch = document.getElementById('orderSearch');
        
        if (method === 'phone') {
            phoneSearch.style.display = 'block';
            orderSearch.style.display = 'none';
        } else {
            phoneSearch.style.display = 'none';
            orderSearch.style.display = 'block';
        }
        
        // 隐藏预约信息
        document.getElementById('reservationInfo').style.display = 'none';
        currentReservation = null;
    }

    // 通过手机号查询
    window.searchByPhone = async function() {
        const phone = document.getElementById('searchPhone').value;
        const phoneResult = window.Validation.validatePhone(phone);
        
        if (!phoneResult.valid) {
            showMessage(phoneResult.message, 'error');
            return;
        }
        
        const reservation = await window.ReservationAPI.getReservationByPhone(phone);
        if (!reservation) {
            showMessage('未找到该手机号的预约记录', 'error');
            return;
        }
        
        await displayReservationInfo(reservation);
    };

    // 通过订单号查询
    window.searchByOrderId = async function() {
        const orderId = document.getElementById('searchOrderId').value;
        const orderResult = window.Validation.validateOrderId(orderId);
        
        if (!orderResult.valid) {
            showMessage(orderResult.message, 'error');
            return;
        }
        
        const reservation = await window.ReservationAPI.getReservationByOrderId(orderId);
        if (!reservation) {
            showMessage('未找到该订单号的预约记录', 'error');
            return;
        }
        
        await displayReservationInfo(reservation);
    };

    // 显示预约信息
    async function displayReservationInfo(reservation) {
        currentReservation = reservation;
        
        const now = new Date();
        const endTime = new Date(reservation.endTime);
        const isOvertime = now > endTime;
        const isCompleted = reservation.status === 'completed';
        
        // 计算停车时长
        const pickupTime = reservation.pickupTime ? new Date(reservation.pickupTime) : now;
        const duration = window.TimeCalculation.calculateDuration(reservation.startTime, pickupTime);
        
        // 计算超时费用
        let overtimeInfo = null;
        if (isOvertime && !isCompleted) {
            overtimeInfo = window.TimeCalculation.calculateOvertime(reservation.endTime, now, 5);
        }
        
        document.getElementById('infoOrderId').textContent = reservation.orderId;
        document.getElementById('infoPhone').textContent = window.Validation.maskPhone(reservation.phoneNumber);
        document.getElementById('infoLocation').textContent = `${reservation.garage}区 ${reservation.level}层 ${reservation.spotNumber}号`;
        document.getElementById('infoTimeRange').textContent = window.TimeCalculation.getTimeRangeText(reservation.startTime, reservation.endTime);
        
        let statusText = '';
        if (isCompleted) {
            statusText = '已完成取车';
        } else if (reservation.status === 'cancelled') {
            statusText = '已取消';
        } else if (isOvertime) {
            statusText = '超时停放';
        } else {
            statusText = '正常停放';
        }
        document.getElementById('infoStatus').textContent = statusText;
        document.getElementById('infoStatus').style.color = isOvertime ? '#ff4757' : '#00a8ff';
        
        document.getElementById('infoDuration').textContent = `${duration} 小时`;
        
        if (overtimeInfo && overtimeInfo.hasOvertime) {
            const overtimeRow = document.getElementById('overtimeRow');
            const overtimeFeeSpan = document.getElementById('overtimeFee');
            if (overtimeRow && overtimeFeeSpan) {
                overtimeRow.style.display = 'flex';
                overtimeFeeSpan.textContent = `¥${overtimeInfo.fee} (超时${overtimeInfo.hours}小时)`;
            }
        } else {
            document.getElementById('overtimeRow').style.display = 'none';
        }
        
        // 禁用取车按钮如果已完成或已取消
        const pickupBtn = document.querySelector('.pickup-btn');
        if (pickupBtn) {
            if (isCompleted || reservation.status === 'cancelled') {
                pickupBtn.disabled = true;
                pickupBtn.style.opacity = '0.5';
                pickupBtn.style.cursor = 'not-allowed';
            } else {
                pickupBtn.disabled = false;
                pickupBtn.style.opacity = '1';
                pickupBtn.style.cursor = 'pointer';
            }
        }
        
        // 存储超时信息供后续使用
        if (overtimeInfo) {
            window.currentOvertimeInfo = overtimeInfo;
        } else {
            window.currentOvertimeInfo = null;
        }
        
        document.getElementById('reservationInfo').style.display = 'block';
    }

    // 确认取车
    window.confirmPickup = function() {
        if (!currentReservation) return;
        
        const now = new Date();
        const endTime = new Date(currentReservation.endTime);
        const isOvertime = now > endTime;
        
        // 显示确认弹窗
        document.getElementById('confirmSpot').textContent = `${currentReservation.garage}区 ${currentReservation.level}层 ${currentReservation.spotNumber}号`;
        document.getElementById('confirmTime').textContent = window.TimeCalculation.getTimeRangeText(currentReservation.startTime, currentReservation.endTime);
        
        if (isOvertime && window.currentOvertimeInfo) {
            document.getElementById('confirmOvertime').style.display = 'block';
            document.getElementById('confirmOvertimeFee').textContent = `¥${window.currentOvertimeInfo.fee}`;
        } else {
            document.getElementById('confirmOvertime').style.display = 'none';
        }
        
        document.getElementById('pickupConfirmModal').style.display = 'flex';
    };

    // 关闭取车确认弹窗
    window.closePickupModal = function() {
        document.getElementById('pickupConfirmModal').style.display = 'none';
    };

    // 关闭超时支付弹窗
    window.closeOvertimeModal = function() {
        document.getElementById('overtimePaymentModal').style.display = 'none';
    };

    // 执行取车
    window.proceedPickup = async function() {
        closePickupModal();
        
        const now = new Date();
        const endTime = new Date(currentReservation.endTime);
        const isOvertime = now > endTime;
        
        if (isOvertime && window.currentOvertimeInfo) {
            // 有超时，显示超时支付弹窗
            const overtimeHours = window.currentOvertimeInfo.hours;
            const overtimeFee = window.currentOvertimeInfo.fee;
            
            document.getElementById('overtimeHours').textContent = overtimeHours;
            document.getElementById('overtimeAmount').textContent = `¥${overtimeFee}`;
            document.getElementById('totalAmount').textContent = `¥${overtimeFee}`;
            document.getElementById('overtimePaymentModal').style.display = 'flex';
        } else {
            // 无超时，直接完成取车
            await completePickup();
        }
    };

    // 前往支付
    window.goToPayment = function() {
        closeOvertimeModal();
        
        // 跳转到支付页面处理超时费用
        window.setTempData('overtimePayment', {
            reservation: currentReservation,
            overtimeInfo: window.currentOvertimeInfo
        });
        window.navigateTo('payment.html');
    };

    // 完成取车
    async function completePickup() {
        const now = new Date().toISOString();
        await window.ReservationAPI.updateReservationStatus(currentReservation.id, 'completed', now);
        
        showMessage('取车成功！感谢您的使用！', 'success');
        
        // 重置页面
        document.getElementById('reservationInfo').style.display = 'none';
        document.getElementById('searchPhone').value = '';
        document.getElementById('searchOrderId').value = '';
        currentReservation = null;
        
        // 刷新主页统计
        if (window.updateHomeStats) {
            window.updateHomeStats();
        }
    }
})();