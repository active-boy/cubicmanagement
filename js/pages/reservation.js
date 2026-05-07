// 预约页面逻辑
(function() {
    'use strict';

    // 页面状态
    let selectedGarage = '';
    let selectedLevel = '';
    let recommendedSpots = [];
    let selectedSpot = null;
    let currentStep = 1;

    // 初始化
    document.addEventListener('DOMContentLoaded', async () => {
        await initGarageSelect();
        initDateAndTime();
        bindEvents();
    });

    // 初始化车库选择
    async function initGarageSelect() {
        const garageSelect = document.getElementById('garageSelect');
        if (garageSelect && window.ParkingDataAPI) {
            const garages = await window.ParkingDataAPI.getGarages();
            garages.forEach(garage => {
                const option = document.createElement('option');
                option.value = garage;
                option.textContent = `${garage}区`;
                garageSelect.appendChild(option);
            });
        }
    }

    // 初始化日期和时间
    function initDateAndTime() {
        const dateInput = document.getElementById('reservationDate');
        const startTimeInput = document.getElementById('startTime');
        const endTimeInput = document.getElementById('endTime');
        
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
            dateInput.min = today;
        }
        
        if (startTimeInput) {
            const now = new Date();
            const currentHour = now.getHours();
            const defaultStart = `${currentHour.toString().padStart(2, '0')}:00`;
            startTimeInput.value = defaultStart;
        }
        
        if (endTimeInput) {
            const now = new Date();
            const nextHour = now.getHours() + 1;
            const defaultEnd = `${nextHour.toString().padStart(2, '0')}:00`;
            endTimeInput.value = defaultEnd;
        }
    }

    // 绑定事件
    function bindEvents() {
        const garageSelect = document.getElementById('garageSelect');
        const levelSelect = document.getElementById('levelSelect');
        
        if (garageSelect) {
            garageSelect.addEventListener('change', (e) => {
                selectedGarage = e.target.value;
            });
        }
        
        if (levelSelect) {
            levelSelect.addEventListener('change', (e) => {
                selectedLevel = e.target.value;
            });
        }
    }

    // 验证步骤1
    async function validateStep1() {
        const phone = document.getElementById('phoneNumber').value;
        const date = document.getElementById('reservationDate').value;
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;
        const garage = document.getElementById('garageSelect').value;
        const level = document.getElementById('levelSelect').value;
        
        // 验证手机号
        if (!phone || phone.length !== 11) {
            showMessage('请输入有效的11位手机号码', 'error');
            return false;
        }
        
        // 验证手机号唯一性
        if (window.ReservationAPI) {
            const isUsed = await window.ReservationAPI.isPhoneNumberUsed(phone);
            if (isUsed) {
                showMessage('该手机号已有预约，一个手机号只能预约一个车位', 'error');
                return false;
            }
        }
        
        // 验证日期时间
        if (!date || !startTime || !endTime) {
            showMessage('请完整填写预约时间', 'error');
            return false;
        }
        
        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);
        
        if (startDateTime >= endDateTime) {
            showMessage('结束时间必须晚于开始时间', 'error');
            return false;
        }
        
        // 验证车库层数
        if (!garage || !level) {
            showMessage('请选择车库号和层数', 'error');
            return false;
        }
        
        return { phone, date, startTime, endTime, garage, level, startDateTime, endDateTime };
    }

    // 前往步骤2（车位推荐）
    window.goToStep2 = async function() {
        const step1Data = await validateStep1();
        if (!step1Data) return;
        
        // 保存表单数据
        sessionStorage.setItem('reservationFormData', JSON.stringify(step1Data));
        
        // 获取推荐车位
        await getRecommendedSpots(step1Data);
        
        // 切换步骤显示
        showStep(2);
    };

    // 获取推荐车位
    async function getRecommendedSpots(formData) {
        const { garage, level, startDateTime, endDateTime } = formData;
        
        // 获取预约数据
        const reservations = await window.ReservationAPI.getReservations();
        
        // 使用推荐算法
        const algorithm = new window.ParkingAlgorithm(null, reservations);
        const spots = algorithm.recommendSpots(garage, parseInt(level), startDateTime, endDateTime, 5);
        
        recommendedSpots = spots;
        displayRecommendedSpots(spots);
    }

    // 显示推荐车位
    function displayRecommendedSpots(spots) {
        const container = document.getElementById('recommendedSpots');
        if (!container) return;
        
        if (spots.length === 0) {
            container.innerHTML = '<div class="no-spots">抱歉，当前时段没有可用车位，请调整时间后重试。</div>';
            return;
        }
        
        // 创建算法实例来获取推荐理由
        const algorithm = new window.ParkingAlgorithm(null, []);
        
        container.innerHTML = spots.map((spot, index) => {
            const reason = algorithm.getRecommendationReason(spot, spot.score);
            return `
                <div class="recommended-spot" data-spot-index="${index}" onclick="selectRecommendedSpot(${index})">
                    <div class="spot-info">
                        <div class="spot-location">车位 ${spot.spotNumber} 号</div>
                        <div class="spot-reason">推荐理由：${reason}</div>
                    </div>
                    <div class="spot-score">推荐度 ${Math.round(spot.score)}%</div>
                </div>
            `;
        }).join('');
    }

    // 选择推荐车位
    window.selectRecommendedSpot = function(index) {
        // 移除其他选中样式
        document.querySelectorAll('.recommended-spot').forEach(el => {
            el.classList.remove('selected');
        });
        
        // 添加选中样式
        const selectedEl = document.querySelector(`.recommended-spot[data-spot-index="${index}"]`);
        if (selectedEl) {
            selectedEl.classList.add('selected');
        }
        
        selectedSpot = recommendedSpots[index];
    };

    // 前往步骤3
    window.goToStep3 = function() {
        if (!selectedSpot) {
            showMessage('请选择一个车位', 'warning');
            return;
        }
        
        const formData = JSON.parse(sessionStorage.getItem('reservationFormData'));
        displayReservationSummary(formData, selectedSpot);
        showStep(3);
    };

    // 显示预约摘要
    function displayReservationSummary(formData, spot) {
        const container = document.getElementById('reservationSummary');
        if (!container) return;
        
        const duration = (formData.endDateTime - formData.startDateTime) / (1000 * 60 * 60);
        const fee = Math.ceil(duration) * 5;
        
        container.innerHTML = `
            <div class="summary-item">
                <span class="summary-label">手机号：</span>
                <span class="summary-value">${maskPhone(formData.phone)}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">预约时间：</span>
                <span class="summary-value">${formatDateTime(formData.startDateTime)} - ${formatDateTime(formData.endDateTime)}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">车库位置：</span>
                <span class="summary-value">${formData.garage}区 ${formData.level}层 ${spot.spotNumber}号车位</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">停车时长：</span>
                <span class="summary-value">${duration.toFixed(1)} 小时</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">费用：</span>
                <span class="summary-value">¥${fee} 元</span>
            </div>
        `;
        
        // 保存预约数据供确认使用
        sessionStorage.setItem('selectedSpot', JSON.stringify(spot));
        sessionStorage.setItem('fee', fee);
    }

    // 确认预约
    window.confirmReservation = async function() {
        const formData = JSON.parse(sessionStorage.getItem('reservationFormData'));
        const spot = JSON.parse(sessionStorage.getItem('selectedSpot'));
        const fee = sessionStorage.getItem('fee');
        
        // 再次检查车位是否可用
        const isAvailable = await window.ReservationAPI.isSpotAvailable(
            formData.garage, 
            parseInt(formData.level), 
            spot.spotNumber, 
            formData.startDateTime, 
            formData.endDateTime
        );
        
        if (!isAvailable) {
            showMessage('抱歉，该车位已被预约，请重新选择', 'error');
            goToStep2();
            return;
        }
        
        // 创建预约
        const reservation = await window.ReservationAPI.createReservation({
            phoneNumber: formData.phone,
            garage: formData.garage,
            level: parseInt(formData.level),
            spotNumber: spot.spotNumber,
            startTime: formData.startDateTime,
            endTime: formData.endDateTime,
            fee: parseInt(fee),
            status: 'pending'
        });
        
        // 跳转到支付页面
        if (window.setTempData) {
            window.setTempData('pendingReservation', reservation);
        } else {
            sessionStorage.setItem('pendingReservation', JSON.stringify(reservation));
        }
        
        // ✅ 通过 MQTT 通知硬件（正确位置）
        if (typeof publishReservation === 'function') {
            publishReservation(formData.garage, formData.level, spot.spotNumber);
        }
        
        window.location.href = 'payment.html';
    };

    // 切换步骤显示
    function showStep(step) {
        currentStep = step;
        
        // 隐藏所有步骤内容
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

    window.goToStep1 = function() {
        showStep(1);
    };
    
    // 辅助函数
    function maskPhone(phone) {
        if (!phone || phone.length !== 11) return phone;
        return phone.substring(0, 3) + '****' + phone.substring(7);
    }
    
    function formatDateTime(date) {
        const d = new Date(date);
        return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    }
})();