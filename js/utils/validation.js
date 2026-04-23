// 表单验证工具类
(function() {
    'use strict';

    const Validation = {
        // 验证手机号
        validatePhone: function(phone) {
            if (!phone) {
                return { valid: false, message: '手机号不能为空' };
            }
            
            const phoneRegex = /^1[3-9]\d{9}$/;
            if (!phoneRegex.test(phone)) {
                return { valid: false, message: '请输入有效的11位手机号码' };
            }
            
            return { valid: true, message: '' };
        },

        // 验证日期时间
        validateDateTime: function(date, startTime, endTime) {
            if (!date) {
                return { valid: false, message: '请选择预约日期' };
            }
            if (!startTime) {
                return { valid: false, message: '请选择开始时间' };
            }
            if (!endTime) {
                return { valid: false, message: '请选择结束时间' };
            }

            const startDateTime = new Date(`${date}T${startTime}`);
            const endDateTime = new Date(`${date}T${endTime}`);
            const now = new Date();

            // 检查是否在今天之后或今天
            if (startDateTime < now.setHours(0, 0, 0, 0)) {
                return { valid: false, message: '预约时间不能早于今天' };
            }

            // 检查开始时间是否早于结束时间
            if (startDateTime >= endDateTime) {
                return { valid: false, message: '结束时间必须晚于开始时间' };
            }

            // 检查预约时长（最长24小时）
            const hoursDiff = (endDateTime - startDateTime) / (1000 * 60 * 60);
            if (hoursDiff > 24) {
                return { valid: false, message: '单次预约不能超过24小时' };
            }
            if (hoursDiff < 0.5) {
                return { valid: false, message: '预约时长至少30分钟' };
            }

            return { valid: true, message: '', data: { startDateTime, endDateTime, hoursDiff } };
        },

        // 验证车库和层数
        validateGarageLevel: function(garage, level) {
            if (!garage) {
                return { valid: false, message: '请选择车库号' };
            }
            if (!level) {
                return { valid: false, message: '请选择层数' };
            }
            
            const garageRegex = /^[A-Z]$/;
            if (!garageRegex.test(garage)) {
                return { valid: false, message: '车库号必须是A-Z之间的字母' };
            }
            
            if (level !== '1' && level !== '2') {
                return { valid: false, message: '层数只能选择1或2' };
            }
            
            return { valid: true, message: '' };
        },

        // 验证车位号
        validateSpotNumber: function(spotNumber) {
            const num = parseInt(spotNumber);
            if (isNaN(num) || num < 1 || num > 26) {
                return { valid: false, message: '车位号必须在1-26之间' };
            }
            return { valid: true, message: '' };
        },

        // 验证预约编号格式
        validateOrderId: function(orderId) {
            if (!orderId) {
                return { valid: false, message: '预约编号不能为空' };
            }
            const orderRegex = /^RES\d{12}[A-Z0-9]{4}$/;
            if (!orderRegex.test(orderId)) {
                return { valid: false, message: '预约编号格式不正确' };
            }
            return { valid: true, message: '' };
        },

        // 验证金额
        validateAmount: function(amount) {
            const num = parseFloat(amount);
            if (isNaN(num) || num < 0) {
                return { valid: false, message: '金额无效' };
            }
            return { valid: true, message: '' };
        },

        // 验证报警描述
        validateAlarmDescription: function(description) {
            if (!description || description.trim().length === 0) {
                return { valid: false, message: '请填写详细描述' };
            }
            if (description.length > 500) {
                return { valid: false, message: '描述不能超过500字' };
            }
            return { valid: true, message: '' };
        },

        // 验证紧急程度
        validateUrgency: function(urgency) {
            const validUrgencies = ['low', 'medium', 'high'];
            if (!urgency || !validUrgencies.includes(urgency)) {
                return { valid: false, message: '请选择紧急程度' };
            }
            return { valid: true, message: '' };
        },

        // 验证位置
        validateLocation: function(location) {
            if (!location) {
                return { valid: false, message: '请选择当前位置' };
            }
            return { valid: true, message: '' };
        },

        // 综合验证表单
        validateReservationForm: function(data) {
            const errors = [];
            
            const phoneResult = this.validatePhone(data.phone);
            if (!phoneResult.valid) errors.push(phoneResult.message);
            
            const dateTimeResult = this.validateDateTime(data.date, data.startTime, data.endTime);
            if (!dateTimeResult.valid) errors.push(dateTimeResult.message);
            
            const garageLevelResult = this.validateGarageLevel(data.garage, data.level);
            if (!garageLevelResult.valid) errors.push(garageLevelResult.message);
            
            return {
                valid: errors.length === 0,
                errors: errors,
                data: dateTimeResult.data
            };
        },

        // 验证手机号唯一性（异步）
        validatePhoneUnique: async function(phone, currentReservationId = null) {
            if (window.isPhoneNumberUsed) {
                const isUsed = await window.isPhoneNumberUsed(phone, currentReservationId);
                if (isUsed) {
                    return { valid: false, message: '该手机号已有预约，一个手机号只能预约一个车位' };
                }
            }
            return { valid: true, message: '' };
        },

        // 格式化手机号（隐藏中间4位）
        maskPhone: function(phone) {
            if (!phone || phone.length !== 11) return phone;
            return phone.substring(0, 3) + '****' + phone.substring(7);
        },

        // 验证码生成（模拟）
        generateVerificationCode: function() {
            return Math.floor(100000 + Math.random() * 900000).toString();
        },

        // 验证验证码
        validateVerificationCode: function(inputCode, generatedCode) {
            if (!inputCode || inputCode.length !== 6) {
                return { valid: false, message: '验证码应为6位数字' };
            }
            if (inputCode !== generatedCode) {
                return { valid: false, message: '验证码错误' };
            }
            return { valid: true, message: '' };
        }
    };

    // 导出验证函数
    window.Validation = Validation;
})();