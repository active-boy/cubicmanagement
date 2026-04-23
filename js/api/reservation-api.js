// 预约接口
(function() {
    'use strict';

    let reservations = [];
    let nextId = 1;

    class ReservationAPI {
        // 获取所有预约
        async getReservations() {
            try {
                const saved = localStorage.getItem('parking_reservations');
                if (saved) {
                    reservations = JSON.parse(saved);
                    if (reservations.length > 0) {
                        nextId = Math.max(...reservations.map(r => r.id)) + 1;
                    }
                }
            } catch (e) {
                console.warn('加载预约数据失败:', e);
                reservations = [];
            }
            return reservations;
        }

        // 保存预约数据
        async saveReservations() {
            localStorage.setItem('parking_reservations', JSON.stringify(reservations));
            // 触发预约更新事件
            window.dispatchEvent(new CustomEvent('reservationsUpdated', { detail: reservations }));
        }

        // 创建新预约
        async createReservation(reservationData) {
            await this.getReservations();
            
            const newReservation = {
                id: nextId++,
                orderId: this.generateOrderId(),
                ...reservationData,
                createdAt: new Date().toISOString(),
                status: 'paid', // pending, paid, completed, cancelled
                pickupTime: null
            };
            
            reservations.push(newReservation);
            await this.saveReservations();
            
            // 更新车位状态为不可用
            if (window.ParkingDataAPI) {
                await window.ParkingDataAPI.updateSpotStatus(
                    reservationData.garage,
                    reservationData.level,
                    reservationData.spotNumber,
                    false
                );
            }
            
            return newReservation;
        }

        // 生成预约编号
        generateOrderId() {
            const date = new Date();
            const dateStr = date.getFullYear() +
                (date.getMonth() + 1).toString().padStart(2, '0') +
                date.getDate().toString().padStart(2, '0') +
                date.getHours().toString().padStart(2, '0') +
                date.getMinutes().toString().padStart(2, '0') +
                date.getSeconds().toString().padStart(2, '0');
            const random = Math.random().toString(36).substring(2, 6).toUpperCase();
            return `RES${dateStr}${random}`;
        }

        // 根据ID获取预约
        async getReservationById(id) {
            await this.getReservations();
            return reservations.find(r => r.id === id) || null;
        }

        // 根据订单号获取预约
        async getReservationByOrderId(orderId) {
            await this.getReservations();
            return reservations.find(r => r.orderId === orderId) || null;
        }

        // 根据手机号获取预约
        async getReservationByPhone(phoneNumber) {
            await this.getReservations();
            return reservations.find(r => r.phoneNumber === phoneNumber && r.status !== 'cancelled');
        }

        // 获取当前有效预约（未完成且未取消）
        async getActiveReservations() {
            await this.getReservations();
            const now = new Date();
            return reservations.filter(r => 
                r.status !== 'cancelled' && 
                r.status !== 'completed' &&
                new Date(r.endTime) >= now
            );
        }

        // 更新预约状态
        async updateReservationStatus(id, status, pickupTime = null) {
            await this.getReservations();
            const reservation = reservations.find(r => r.id === id);
            if (reservation) {
                reservation.status = status;
                if (pickupTime) {
                    reservation.pickupTime = pickupTime;
                }
                reservation.updatedAt = new Date().toISOString();
                await this.saveReservations();
                
                // 如果完成取车，释放车位
                if (status === 'completed') {
                    if (window.ParkingDataAPI) {
                        await window.ParkingDataAPI.updateSpotStatus(
                            reservation.garage,
                            reservation.level,
                            reservation.spotNumber,
                            true
                        );
                    }
                }
                
                return true;
            }
            return false;
        }

        // 取消预约
        async cancelReservation(id) {
            await this.getReservations();
            const reservation = reservations.find(r => r.id === id);
            if (reservation && reservation.status !== 'completed') {
                reservation.status = 'cancelled';
                reservation.cancelledAt = new Date().toISOString();
                await this.saveReservations();
                
                // 释放车位
                if (window.ParkingDataAPI) {
                    await window.ParkingDataAPI.updateSpotStatus(
                        reservation.garage,
                        reservation.level,
                        reservation.spotNumber,
                        true
                    );
                }
                
                return true;
            }
            return false;
        }

        // 检查手机号是否已有预约
        async isPhoneNumberUsed(phoneNumber, excludeId = null) {
            await this.getReservations();
            return reservations.some(r => 
                r.phoneNumber === phoneNumber && 
                r.status !== 'cancelled' &&
                r.status !== 'completed' &&
                r.id !== excludeId
            );
        }

        // 检查车位是否可用
        async isSpotAvailable(garage, level, spotNumber, startTime, endTime, excludeId = null) {
            await this.getReservations();
            const start = new Date(startTime);
            const end = new Date(endTime);
            
            const conflict = reservations.find(r => 
                r.garage === garage &&
                r.level === level &&
                r.spotNumber === spotNumber &&
                r.status !== 'cancelled' &&
                r.id !== excludeId &&
                ((start >= new Date(r.startTime) && start < new Date(r.endTime)) ||
                 (end > new Date(r.startTime) && end <= new Date(r.endTime)) ||
                 (start <= new Date(r.startTime) && end >= new Date(r.endTime)))
            );
            
            return !conflict;
        }

        // 获取所有预约（用于管理）
        async getAllReservations() {
            await this.getReservations();
            return [...reservations].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        // 删除过期预约（自动清理）
        async cleanExpiredReservations() {
            await this.getReservations();
            const now = new Date();
            const expiredReservations = reservations.filter(r => 
                r.status !== 'completed' &&
                r.status !== 'cancelled' &&
                new Date(r.endTime) < now
            );
            
            for (const expired of expiredReservations) {
                expired.status = 'expired';
                // 释放车位
                if (window.ParkingDataAPI) {
                    await window.ParkingDataAPI.updateSpotStatus(
                        expired.garage,
                        expired.level,
                        expired.spotNumber,
                        true
                    );
                }
            }
            
            if (expiredReservations.length > 0) {
                await this.saveReservations();
            }
            
            return expiredReservations.length;
        }

        // 获取预约统计
        async getReservationStats() {
            await this.getReservations();
            const now = new Date();
            
            const stats = {
                total: reservations.length,
                active: reservations.filter(r => r.status === 'paid' && new Date(r.endTime) >= now).length,
                completed: reservations.filter(r => r.status === 'completed').length,
                cancelled: reservations.filter(r => r.status === 'cancelled').length,
                expired: reservations.filter(r => r.status === 'expired').length
            };
            
            return stats;
        }
    }

    // 导出API
    window.ReservationAPI = new ReservationAPI();
    
    // 定时清理过期预约（每小时执行一次）
    setInterval(() => {
        if (window.ReservationAPI) {
            window.ReservationAPI.cleanExpiredReservations();
        }
    }, 60 * 60 * 1000);
})();