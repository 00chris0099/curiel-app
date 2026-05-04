const User = require('./User');
const Role = require('./Role');
const UserRole = require('./UserRole');
const Inspection = require('./Inspection');
const InspectionStatusHistory = require('./InspectionStatusHistory');
const InspectionArea = require('./InspectionArea');
const InspectionObservation = require('./InspectionObservation');
const InspectionSummary = require('./InspectionSummary');
const Notification = require('./Notification');
const ChecklistTemplate = require('./ChecklistTemplate');
const ChecklistItem = require('./ChecklistItem');
const InspectionResponse = require('./InspectionResponse');
const Photo = require('./Photo');
const Signature = require('./Signature');
const AuditLog = require('./AuditLog');

// ========================
// RELACIONES ENTRE MODELOS
// ========================

// User - Inspection (Inspector)
User.hasMany(Inspection, {
    foreignKey: 'inspectorId',
    as: 'assignedInspections'
});
Inspection.belongsTo(User, {
    foreignKey: 'inspectorId',
    as: 'inspector'
});

// User - Inspection (Creador)
User.hasMany(Inspection, {
    foreignKey: 'createdById',
    as: 'createdInspections'
});
Inspection.belongsTo(User, {
    foreignKey: 'createdById',
    as: 'creator'
});

// ChecklistTemplate - ChecklistItem
ChecklistTemplate.hasMany(ChecklistItem, {
    foreignKey: 'templateId',
    as: 'items',
    onDelete: 'CASCADE'
});
ChecklistItem.belongsTo(ChecklistTemplate, {
    foreignKey: 'templateId',
    as: 'template'
});

// Inspection - InspectionResponse
Inspection.hasMany(InspectionResponse, {
    foreignKey: 'inspectionId',
    as: 'responses',
    onDelete: 'CASCADE'
});
InspectionResponse.belongsTo(Inspection, {
    foreignKey: 'inspectionId',
    as: 'inspection'
});

// Inspection - InspectionStatusHistory
Inspection.hasMany(InspectionStatusHistory, {
    foreignKey: 'inspectionId',
    as: 'statusHistory',
    onDelete: 'CASCADE'
});
InspectionStatusHistory.belongsTo(Inspection, {
    foreignKey: 'inspectionId',
    as: 'inspection'
});

// Inspection - InspectionArea
Inspection.hasMany(InspectionArea, {
    foreignKey: 'inspectionId',
    as: 'areas',
    onDelete: 'CASCADE'
});
InspectionArea.belongsTo(Inspection, {
    foreignKey: 'inspectionId',
    as: 'inspection'
});

// Inspection - InspectionObservation
Inspection.hasMany(InspectionObservation, {
    foreignKey: 'inspectionId',
    as: 'technicalObservations',
    onDelete: 'CASCADE'
});
InspectionObservation.belongsTo(Inspection, {
    foreignKey: 'inspectionId',
    as: 'inspection'
});

// Inspection - InspectionSummary
Inspection.hasOne(InspectionSummary, {
    foreignKey: 'inspectionId',
    as: 'summary',
    onDelete: 'CASCADE'
});
InspectionSummary.belongsTo(Inspection, {
    foreignKey: 'inspectionId',
    as: 'inspection'
});

// InspectionArea - InspectionObservation
InspectionArea.hasMany(InspectionObservation, {
    foreignKey: 'areaId',
    as: 'observations',
    onDelete: 'CASCADE'
});
InspectionObservation.belongsTo(InspectionArea, {
    foreignKey: 'areaId',
    as: 'area'
});

// ChecklistItem - InspectionResponse
ChecklistItem.hasMany(InspectionResponse, {
    foreignKey: 'checklistItemId',
    as: 'responses'
});
InspectionResponse.belongsTo(ChecklistItem, {
    foreignKey: 'checklistItemId',
    as: 'checklistItem'
});

// Inspection - Photo
Inspection.hasMany(Photo, {
    foreignKey: 'inspectionId',
    as: 'photos',
    onDelete: 'CASCADE'
});
Photo.belongsTo(Inspection, {
    foreignKey: 'inspectionId',
    as: 'inspection'
});

// InspectionArea - Photo
InspectionArea.hasMany(Photo, {
    foreignKey: 'areaId',
    as: 'photos'
});
Photo.belongsTo(InspectionArea, {
    foreignKey: 'areaId',
    as: 'area'
});

// InspectionObservation - Photo
InspectionObservation.hasMany(Photo, {
    foreignKey: 'observationId',
    as: 'photos'
});
Photo.belongsTo(InspectionObservation, {
    foreignKey: 'observationId',
    as: 'observation'
});

// ChecklistItem - Photo (opcional)
ChecklistItem.hasMany(Photo, {
    foreignKey: 'checklistItemId',
    as: 'photos'
});
Photo.belongsTo(ChecklistItem, {
    foreignKey: 'checklistItemId',
    as: 'checklistItem'
});

// User - Photo
User.hasMany(Photo, {
    foreignKey: 'uploadedById',
    as: 'uploadedPhotos'
});
Photo.belongsTo(User, {
    foreignKey: 'uploadedById',
    as: 'uploader'
});

// User - InspectionObservation
User.hasMany(InspectionObservation, {
    foreignKey: 'createdBy',
    as: 'createdTechnicalObservations'
});
InspectionObservation.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator'
});

// User - InspectionStatusHistory
User.hasMany(InspectionStatusHistory, {
    foreignKey: 'changedByUserId',
    as: 'inspectionStatusChanges'
});
InspectionStatusHistory.belongsTo(User, {
    foreignKey: 'changedByUserId',
    as: 'changedByUser'
});

// Inspection - Signature
Inspection.hasMany(Signature, {
    foreignKey: 'inspectionId',
    as: 'signatures',
    onDelete: 'CASCADE'
});
Signature.belongsTo(Inspection, {
    foreignKey: 'inspectionId',
    as: 'inspection'
});

// User - ChecklistTemplate
User.hasMany(ChecklistTemplate, {
    foreignKey: 'createdById',
    as: 'createdTemplates'
});
ChecklistTemplate.belongsTo(User, {
    foreignKey: 'createdById',
    as: 'creator'
});

// User - AuditLog
User.hasMany(AuditLog, {
    foreignKey: 'userId',
    as: 'auditLogs'
});
AuditLog.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

// User - Notification
User.hasMany(Notification, {
    foreignKey: 'userId',
    as: 'notifications',
    onDelete: 'CASCADE'
});
Notification.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

// Inspection - Notification
Inspection.hasMany(Notification, {
    foreignKey: 'inspectionId',
    as: 'notifications',
    onDelete: 'CASCADE'
});
Notification.belongsTo(Inspection, {
    foreignKey: 'inspectionId',
    as: 'inspection'
});

// User - Role (many-to-many)
User.belongsToMany(Role, {
    through: UserRole,
    foreignKey: 'userId',
    otherKey: 'roleId',
    as: 'roles'
});
Role.belongsToMany(User, {
    through: UserRole,
    foreignKey: 'roleId',
    otherKey: 'userId',
    as: 'users'
});

// UserRole relations
UserRole.belongsTo(User, { foreignKey: 'userId' });
UserRole.belongsTo(Role, { foreignKey: 'roleId' });

// Exportar todos los modelos
module.exports = {
    User,
    Role,
    UserRole,
    Inspection,
    InspectionStatusHistory,
    InspectionArea,
    InspectionObservation,
    InspectionSummary,
    Notification,
    ChecklistTemplate,
    ChecklistItem,
    InspectionResponse,
    Photo,
    Signature,
    AuditLog
};
