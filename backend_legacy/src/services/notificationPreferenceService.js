const { prisma } = require('../lib/databases');

class NotificationPreferenceService {
    async getPreference(userId) {
        let pref = await prisma.notificaciones.notificationPreference.findUnique({
            where: { userId }
        });

        if (!pref) {
            pref = await prisma.notificaciones.notificationPreference.create({
                data: { userId }
            });
        }

        return pref;
    }

    async updatePreference(userId, data) {
        const existing = await prisma.notificaciones.notificationPreference.findUnique({
            where: { userId }
        });

        if (existing) {
            return prisma.notificaciones.notificationPreference.update({
                where: { userId },
                data
            });
        }

        return prisma.notificaciones.notificationPreference.create({
            data: { userId, ...data }
        });
    }

    async shouldNotify(userId, category, channel) {
        const pref = await this.getPreference(userId);

        if (channel === 'email' && !pref.emailEnabled) return false;
        if (channel === 'push' && !pref.pushEnabled) return false;
        if (channel === 'in_app' && !pref.inAppEnabled) return false;

        if (pref.categories && typeof pref.categories === 'object') {
            if (pref.categories[category] === false) return false;
        }

        if (pref.quietHoursStart && pref.quietHoursEnd) {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const [startH, startM] = pref.quietHoursStart.split(':').map(Number);
            const [endH, endM] = pref.quietHoursEnd.split(':').map(Number);
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;

            if (startMinutes > endMinutes) {
                if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
                    if (channel === 'push') return false;
                }
            } else {
                if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
                    if (channel === 'push') return false;
                }
            }
        }

        return true;
    }
}

module.exports = new NotificationPreferenceService();
