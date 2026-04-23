// 应急报警页面逻辑
(function() {
    'use strict';

    let selectedAlarmType = null;
    let alarmHistory = [];
    let pendingAlarm = null;

    // 报警类型配置
    const alarmTypeConfig = {
        fire: { name: '火灾报警', emergencyNumber: '119', color: '#ff4757' },
        accident: { name: '车辆事故', emergencyNumber: '122', color: '#ffa502' },
        medical: { name: '医疗急救', emergencyNumber: '120', color: '#00a8ff' },
        security: { name: '安全威胁', emergencyNumber: '110', color: '#8e44ad' },
        technical: { name: '设备故障', emergencyNumber: '400-123-4567', color: '#f39c12' },
        other: { name: '其他紧急情况', emergencyNumber: '400-123-4567', color: '#95a5a6' }
    };

    // 初始化
    document.addEventListener('DOMContentLoaded', async () => {
        await initGarageSelect();
        await loadAlarmHistory();
        bindTypeCardEvents();
    });

    // 初始化车库选择
    async function initGarageSelect() {
        const garageSelect = document.getElementById('alarmGarage');
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

    // 加载报警历史
    async function loadAlarmHistory() {
        try {
            const saved = localStorage.getItem('parking_alarms');
            if (saved) {
                alarmHistory = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('加载报警历史失败:', e);
            alarmHistory = [];
        }
        displayAlarmHistory();
    }

    // 保存报警历史
    function saveAlarmHistory() {
        localStorage.setItem('parking_alarms', JSON.stringify(alarmHistory.slice(0, 20))); // 只保留最近20条
    }

    // 显示报警历史
    function displayAlarmHistory() {
        const historyList = document.getElementById('alarmHistory');
        if (!historyList) return;

        if (alarmHistory.length === 0) {
            historyList.innerHTML = '<div class="history-empty">暂无报警记录</div>';
            return;
        }

        historyList.innerHTML = alarmHistory.slice(0, 10).map(alarm => `
            <div class="history-item ${alarm.type}">
                <div class="history-header">
                    <span class="history-type">${alarmTypeConfig[alarm.type]?.name || alarm.type}</span>
                    <span class="history-time">${window.TimeCalculation.formatTime(alarm.time, 'full')}</span>
                </div>
                <div class="history-location">${alarm.location} - ${alarm.garage}区${alarm.level}层</div>
                <div class="history-desc">${alarm.description.substring(0, 50)}${alarm.description.length > 50 ? '...' : ''}</div>
                <span class="history-status status-${alarm.status}">${getStatusText(alarm.status)}</span>
            </div>
        `).join('');
    }

    function getStatusText(status) {
        const statusMap = {
            pending: '处理中',
            processing: '已受理',
            resolved: '已解决'
        };
        return statusMap[status] || status;
    }

    // 绑定报警类型卡片事件
    function bindTypeCardEvents() {
        const cards = document.querySelectorAll('.type-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const type = card.getAttribute('data-type');
                selectAlarmType(type);
            });
        });
    }

    // 选择报警类型
    window.selectAlarmType = function(type) {
        // 移除其他选中样式
        document.querySelectorAll('.type-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // 添加选中样式
        const selectedCard = document.querySelector(`.type-card[data-type="${type}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
        
        selectedAlarmType = type;
        
        // 显示报警表单
        const alarmForm = document.getElementById('alarmForm');
        if (alarmForm) {
            alarmForm.style.display = 'block';
            alarmForm.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // 提交报警
    window.submitAlarm = function() {
        if (!selectedAlarmType) {
            showMessage('请先选择报警类型', 'warning');
            return;
        }
        
        const phone = document.getElementById('alarmPhone').value;
        const location = document.getElementById('alarmLocation').value;
        const garage = document.getElementById('alarmGarage').value;
        const level = document.getElementById('alarmLevel').value;
        const description = document.getElementById('alarmDescription').value;
        const urgency = document.querySelector('input[name="urgency"]:checked');
        
        // 验证
        const phoneResult = window.Validation.validatePhone(phone);
        if (!phoneResult.valid) {
            showMessage(phoneResult.message, 'error');
            return;
        }
        
        const locationResult = window.Validation.validateLocation(location);
        if (!locationResult.valid) {
            showMessage(locationResult.message, 'error');
            return;
        }
        
        const descResult = window.Validation.validateAlarmDescription(description);
        if (!descResult.valid) {
            showMessage(descResult.message, 'error');
            return;
        }
        
        if (!urgency) {
            showMessage('请选择紧急程度', 'warning');
            return;
        }
        
        // 构建报警信息
        pendingAlarm = {
            type: selectedAlarmType,
            phone: phone,
            location: location,
            garage: garage,
            level: level,
            description: description,
            urgency: urgency.value,
            time: new Date().toISOString(),
            status: 'pending'
        };
        
        // 显示确认弹窗
        const config = alarmTypeConfig[selectedAlarmType];
        const confirmMsg = document.getElementById('alarmConfirmMsg');
        if (confirmMsg) {
            confirmMsg.innerHTML = `
                <strong>报警类型：</strong>${config.name}<br>
                <strong>位置：</strong>${location} - ${garage}区${level}层<br>
                <strong>紧急程度：</strong>${getUrgencyText(urgency.value)}<br>
                <strong>联系电话：</strong>${config.emergencyNumber}
            `;
        }
        
        document.getElementById('alarmConfirmModal').style.display = 'flex';
    };

    // 确认报警
    window.confirmAlarm = function() {
        if (pendingAlarm) {
            // 添加到历史记录
            alarmHistory.unshift(pendingAlarm);
            saveAlarmHistory();
            displayAlarmHistory();
            
            // 显示成功消息
            showMessage('报警已提交！工作人员将尽快联系您处理。', 'success');
            
            // 重置表单
            resetAlarmForm();
            
            // 关闭模态框
            closeAlarmModal();
            
            // 可选：实际报警电话跳转（模拟）
            const config = alarmTypeConfig[pendingAlarm.type];
            if (config.emergencyNumber.length === 3) {
                setTimeout(() => {
                    if (confirm(`是否拨打紧急电话 ${config.emergencyNumber}？`)) {
                        window.location.href = `tel:${config.emergencyNumber}`;
                    }
                }, 1000);
            }
        }
        pendingAlarm = null;
    };

    // 重置报警表单
    window.resetAlarmForm = function() {
        document.getElementById('alarmPhone').value = '';
        document.getElementById('alarmLocation').value = '';
        document.getElementById('alarmGarage').value = '';
        document.getElementById('alarmLevel').value = '';
        document.getElementById('alarmDescription').value = '';
        
        const urgencyRadios = document.querySelectorAll('input[name="urgency"]');
        urgencyRadios.forEach(radio => radio.checked = false);
        
        // 取消类型选择
        document.querySelectorAll('.type-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        selectedAlarmType = null;
        
        const alarmForm = document.getElementById('alarmForm');
        if (alarmForm) {
            alarmForm.style.display = 'none';
        }
    };

    // 关闭报警模态框
    window.closeAlarmModal = function() {
        document.getElementById('alarmConfirmModal').style.display = 'none';
        pendingAlarm = null;
    };

    function getUrgencyText(urgency) {
        const map = {
            low: '一般',
            medium: '紧急',
            high: '非常紧急'
        };
        return map[urgency] || urgency;
    }
})();