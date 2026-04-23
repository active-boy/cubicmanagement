// 收费接口
(function() {
    'use strict';

    // 支付记录
    let paymentRecords = [];
    let nextPaymentId = 1;

    class PaymentAPI {
        // 获取支付记录
        async getPaymentRecords() {
            try {
                const saved = localStorage.getItem('parking_payments');
                if (saved) {
                    paymentRecords = JSON.parse(saved);
                    if (paymentRecords.length > 0) {
                        nextPaymentId = Math.max(...paymentRecords.map(p => p.id)) + 1;
                    }
                }
            } catch (e) {
                console.warn('加载支付记录失败:', e);
                paymentRecords = [];
            }
            return paymentRecords;
        }

        // 保存支付记录
        async savePaymentRecords() {
            localStorage.setItem('parking_payments', JSON.stringify(paymentRecords));
        }

        // 创建支付订单
        async createPayment(reservationId, amount, paymentMethod = null) {
            await this.getPaymentRecords();
            
            const payment = {
                id: nextPaymentId++,
                reservationId: reservationId,
                amount: amount,
                status: 'pending',
                paymentMethod: paymentMethod,
                createdAt: new Date().toISOString(),
                paidAt: null,
                transactionId: this.generateTransactionId()
            };
            
            paymentRecords.push(payment);
            await this.savePaymentRecords();
            
            return payment;
        }

        // 生成交易号
        generateTransactionId() {
            const date = new Date();
            const dateStr = date.getFullYear() +
                (date.getMonth() + 1).toString().padStart(2, '0') +
                date.getDate().toString().padStart(2, '0') +
                date.getHours().toString().padStart(2, '0') +
                date.getMinutes().toString().padStart(2, '0') +
                date.getSeconds().toString().padStart(2, '0');
            const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            return `TXN${dateStr}${random}`;
        }

        // 处理支付
        async processPayment(paymentId, paymentMethod) {
            await this.getPaymentRecords();
            const payment = paymentRecords.find(p => p.id === paymentId);
            
            if (!payment) {
                return { success: false, message: '支付订单不存在' };
            }
            
            if (payment.status === 'completed') {
                return { success: false, message: '该订单已完成支付' };
            }
            
            // 模拟支付处理
            const success = await this.mockPaymentProcess(payment.amount, paymentMethod);
            
            if (success) {
                payment.status = 'completed';
                payment.paymentMethod = paymentMethod;
                payment.paidAt = new Date().toISOString();
                await this.savePaymentRecords();
                
                // 更新预约状态
                if (window.ReservationAPI) {
                    const reservation = await window.ReservationAPI.getReservationById(payment.reservationId);
                    if (reservation && reservation.status === 'pending') {
                        await window.ReservationAPI.updateReservationStatus(reservation.id, 'paid');
                    }
                }
                
                return {
                    success: true,
                    message: '支付成功',
                    payment: payment,
                    transactionId: payment.transactionId
                };
            } else {
                payment.status = 'failed';
                await this.savePaymentRecords();
                return {
                    success: false,
                    message: '支付失败，请重试',
                    payment: payment
                };
            }
        }

        // 模拟支付处理
        async mockPaymentProcess(amount, paymentMethod) {
            // 模拟网络延迟
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 模拟支付成功率（95%）
            const successRate = Math.random() < 0.95;
            return successRate;
        }

        // 获取支付状态
        async getPaymentStatus(paymentId) {
            await this.getPaymentRecords();
            const payment = paymentRecords.find(p => p.id === paymentId);
            if (payment) {
                return {
                    status: payment.status,
                    amount: payment.amount,
                    paidAt: payment.paidAt,
                    transactionId: payment.transactionId
                };
            }
            return null;
        }

        // 根据预约ID获取支付记录
        async getPaymentByReservationId(reservationId) {
            await this.getPaymentRecords();
            return paymentRecords.find(p => p.reservationId === reservationId) || null;
        }

        // 计算超时费用
        async calculateOvertimeFee(reservationId, actualPickupTime) {
            if (window.ReservationAPI) {
                const reservation = await window.ReservationAPI.getReservationById(reservationId);
                if (reservation && window.TimeCalculation) {
                    const overtime = window.TimeCalculation.calculateOvertime(
                        reservation.endTime,
                        actualPickupTime,
                        5 // 每小时5元
                    );
                    
                    if (overtime.hasOvertime) {
                        return {
                            hasOvertime: true,
                            hours: overtime.hours,
                            fee: overtime.fee,
                            totalFee: overtime.fee
                        };
                    }
                }
            }
            
            return {
                hasOvertime: false,
                hours: 0,
                fee: 0,
                totalFee: 0
            };
        }

        // 处理超时支付
        async processOvertimePayment(reservationId, actualPickupTime, paymentMethod) {
            const overtimeInfo = await this.calculateOvertimeFee(reservationId, actualPickupTime);
            
            if (!overtimeInfo.hasOvertime) {
                return {
                    success: true,
                    message: '无需支付超时费用',
                    amount: 0
                };
            }
            
            // 创建超时支付记录
            const payment = await this.createPayment(reservationId, overtimeInfo.fee, paymentMethod);
            const result = await this.processPayment(payment.id, paymentMethod);
            
            if (result.success) {
                return {
                    success: true,
                    message: '超时费用支付成功',
                    amount: overtimeInfo.fee,
                    hours: overtimeInfo.hours,
                    payment: result.payment
                };
            }
            
            return {
                success: false,
                message: '超时费用支付失败',
                amount: overtimeInfo.fee
            };
        }

        // 获取支付统计
        async getPaymentStats() {
            await this.getPaymentRecords();
            
            const completedPayments = paymentRecords.filter(p => p.status === 'completed');
            const totalAmount = completedPayments.reduce((sum, p) => sum + p.amount, 0);
            
            return {
                totalTransactions: paymentRecords.length,
                completedTransactions: completedPayments.length,
                failedTransactions: paymentRecords.filter(p => p.status === 'failed').length,
                totalRevenue: totalAmount,
                averageAmount: completedPayments.length > 0 ? totalAmount / completedPayments.length : 0
            };
        }

        // 获取支付方式统计
        async getPaymentMethodStats() {
            await this.getPaymentRecords();
            const completedPayments = paymentRecords.filter(p => p.status === 'completed');
            
            const methodStats = {
                wechat: { count: 0, amount: 0 },
                alipay: { count: 0, amount: 0 },
                card: { count: 0, amount: 0 }
            };
            
            for (const payment of completedPayments) {
                if (payment.paymentMethod && methodStats[payment.paymentMethod]) {
                    methodStats[payment.paymentMethod].count++;
                    methodStats[payment.paymentMethod].amount += payment.amount;
                }
            }
            
            return methodStats;
        }

        // 退款（如果需要）
        async refund(paymentId) {
            await this.getPaymentRecords();
            const payment = paymentRecords.find(p => p.id === paymentId);
            
            if (!payment || payment.status !== 'completed') {
                return { success: false, message: '无法退款：订单不存在或未完成支付' };
            }
            
            payment.status = 'refunded';
            payment.refundedAt = new Date().toISOString();
            await this.savePaymentRecords();
            
            return {
                success: true,
                message: '退款成功',
                amount: payment.amount
            };
        }
    }

    // 导出API
    window.PaymentAPI = new PaymentAPI();
})();