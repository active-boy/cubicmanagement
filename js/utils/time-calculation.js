// 时间计算工具类
(function() {
    'use strict';

    const TimeCalculation = {
        // 计算停车时长（小时）
        calculateDuration: function(startDateTime, endDateTime) {
            const start = new Date(startDateTime);
            const end = new Date(endDateTime);
            const diffMs = end - start;
            const diffHours = diffMs / (1000 * 60 * 60);
            return Math.ceil(diffHours * 10) / 10; // 保留一位小数
        },

        // 计算超时时长和费用
        calculateOvertime: function(endTime, actualPickupTime, hourlyRate = 5) {
            const end = new Date(endTime);
            const actual = new Date(actualPickupTime);
            
            if (actual <= end) {
                return { hasOvertime: false, hours: 0, fee: 0 };
            }
            
            const overtimeMs = actual - end;
            const overtimeHours = Math.ceil(overtimeMs / (1000 * 60 * 60));
            const overtimeFee = overtimeHours * hourlyRate;
            
            return {
                hasOvertime: true,
                hours: overtimeHours,
                fee: overtimeFee,
                endTime: end,
                actualTime: actual
            };
        },

        // 计算总费用（基础费用+超时费用）
        calculateTotalFee: function(startTime, endTime, actualPickupTime = null, hourlyRate = 5) {
            const start = new Date(startTime);
            const end = new Date(endTime);
            const pickup = actualPickupTime ? new Date(actualPickupTime) : end;
            
            const totalHours = this.calculateDuration(start, pickup);
            const baseFee = Math.ceil(totalHours) * hourlyRate;
            
            let overtimeFee = 0;
            if (actualPickupTime && new Date(actualPickupTime) > end) {
                const overtime = this.calculateOvertime(endTime, actualPickupTime, hourlyRate);
                overtimeFee = overtime.fee;
            }
            
            return {
                totalHours: totalHours,
                baseFee: baseFee,
                overtimeFee: overtimeFee,
                totalFee: baseFee + overtimeFee
            };
        },

        // 格式化时间显示
        formatTime: function(dateTime, format = 'full') {
            const date = new Date(dateTime);
            
            const formats = {
                full: () => date.toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                }),
                date: () => date.toLocaleDateString('zh-CN'),
                time: () => date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
                datetime: () => date.toLocaleString('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                short: () => {
                    const month = date.getMonth() + 1;
                    const day = date.getDate();
                    const hour = date.getHours().toString().padStart(2, '0');
                    const minute = date.getMinutes().toString().padStart(2, '0');
                    return `${month}/${day} ${hour}:${minute}`;
                }
            };
            
            return formats[format] ? formats[format]() : formats.full();
        },

        // 获取当前时间
        getCurrentTime: function() {
            return new Date();
        },

        // 获取当前时间字符串（用于API）
        getCurrentTimeString: function() {
            return new Date().toISOString();
        },

        // 判断是否超时
        isOvertime: function(endTime) {
            return new Date() > new Date(endTime);
        },

        // 判断预约是否即将开始（15分钟内）
        isStartingSoon: function(startTime) {
            const start = new Date(startTime);
            const now = new Date();
            const diffMs = start - now;
            const diffMinutes = diffMs / (1000 * 60);
            return diffMinutes > 0 && diffMinutes <= 15;
        },

        // 判断预约是否已过期
        isExpired: function(endTime) {
            return new Date() > new Date(endTime);
        },

        // 获取可预约的时间段（未来24小时，每小时一个时段）
        getAvailableTimeSlots: function() {
            const slots = [];
            const now = new Date();
            const startHour = now.getHours();
            
            for (let i = 1; i <= 24; i++) {
                const hour = (startHour + i) % 24;
                const time = `${hour.toString().padStart(2, '0')}:00`;
                slots.push({
                    value: time,
                    label: `${time} - ${(hour + 1).toString().padStart(2, '0')}:00`
                });
            }
            
            return slots;
        },

        // 获取未来7天的日期
        getAvailableDates: function() {
            const dates = [];
            const today = new Date();
            
            for (let i = 0; i <= 7; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                const dateStr = date.toISOString().split('T')[0];
                const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                
                dates.push({
                    value: dateStr,
                    label: `${date.getMonth() + 1}/${date.getDate()} (${weekdays[date.getDay()]})`,
                    disabled: i === 0 && date.getHours() >= 22 // 今天22点后不能预约
                });
            }
            
            return dates;
        },

        // 计算剩余时间（用于倒计时）
        getRemainingTime: function(targetTime) {
            const target = new Date(targetTime);
            const now = new Date();
            const diffMs = target - now;
            
            if (diffMs <= 0) {
                return { hours: 0, minutes: 0, seconds: 0, isExpired: true };
            }
            
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
            
            return { hours, minutes, seconds, isExpired: false };
        },

        // 获取时间段显示文本
        getTimeRangeText: function(startTime, endTime) {
            const start = this.formatTime(startTime, 'short');
            const end = this.formatTime(endTime, 'short');
            return `${start} 至 ${end}`;
        }
    };

    // 导出时间计算函数
    window.TimeCalculation = TimeCalculation;
})();