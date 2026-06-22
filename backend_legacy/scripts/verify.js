#!/usr/bin/env node

/**
 * Script de verificacion rapida del backend CURIEL (Prisma)
 * Verifica que todos los modulos esten correctamente configurados
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 VERIFICANDO BACKEND CURIEL...\n');

const checks = [];

// ============================================
// 1. Verificar estructura de carpetas
// ============================================
console.log('📁 Verificando estructura de carpetas...');

const requiredDirs = [
    'src/config',
    'src/controllers',
    'src/middlewares',
    'src/routes',
    'src/services',
    'src/utils',
    'src/validators',
    'src/modules'
];

requiredDirs.forEach(dir => {
    const exists = fs.existsSync(path.join(__dirname, '..', dir));
    checks.push({
        name: `📂 ${dir}`,
        status: exists,
        required: true
    });
});

// ============================================
// 2. Verificar archivos criticos
// ============================================
console.log('📄 Verificando archivos criticos...');

const requiredFiles = [
    'src/server.js',
    'src/config/index.js',
    'src/config/swagger.js',
    'src/routes/index.js',
    'package.json',
    '.env',
    'prisma/prisma.js'
];

requiredFiles.forEach(file => {
    const exists = fs.existsSync(path.join(__dirname, '..', file));
    checks.push({
        name: `📄 ${file}`,
        status: exists,
        required: file !== '.env'
    });
});

// ============================================
// 3. Verificar controllers
// ============================================
console.log('🎮 Verificando controllers...');

const requiredControllers = [
    'authController.js',
    'userController.js',
    'inspectionController.js',
    'inspectionExecutionController.js',
    'checklistController.js',
    'photoController.js',
    'notificationController.js'
];

requiredControllers.forEach(controller => {
    const exists = fs.existsSync(path.join(__dirname, '../src/controllers', controller));
    checks.push({
        name: `🎮 controllers/${controller}`,
        status: exists,
        required: true
    });
});

// ============================================
// 4. Verificar services
// ============================================
console.log('⚙️  Verificando services...');

const requiredServices = [
    'userService.js',
    'inspectionService.js',
    'inspectionExecutionService.js',
    'checklistService.js',
    'notificationService.js'
];

requiredServices.forEach(service => {
    const exists = fs.existsSync(path.join(__dirname, '../src/services', service));
    checks.push({
        name: `⚙️  services/${service}`,
        status: exists,
        required: true
    });
});

// ============================================
// 5. Verificar routes
// ============================================
console.log('🛣️  Verificando routes...');

const requiredRoutes = [
    'authRoutes.js',
    'usersRoutes.js',
    'inspectionRoutes.js',
    'inspectionExecutionRoutes.js',
    'checklistRoutes.js',
    'photoRoutes.js',
    'notificationRoutes.js',
    'index.js'
];

requiredRoutes.forEach(route => {
    const exists = fs.existsSync(path.join(__dirname, '../src/routes', route));
    checks.push({
        name: `🛣️  routes/${route}`,
        status: exists,
        required: true
    });
});

// ============================================
// 6. Verificar validators
// ============================================
console.log('✅ Verificando validators...');

const requiredValidators = [
    'userValidator.js',
    'inspectionValidator.js',
    'checklistValidator.js',
    'inspectionExecutionValidator.js'
];

requiredValidators.forEach(validator => {
    const exists = fs.existsSync(path.join(__dirname, '../src/validators', validator));
    checks.push({
        name: `✅ validators/${validator}`,
        status: exists,
        required: true
    });
});

// ============================================
// 7. Verificar middlewares
// ============================================
console.log('🔒 Verificando middlewares...');

const requiredMiddlewares = [
    'auth.js',
    'auditLog.js',
    'errorHandler.js',
    'upload.js',
    'validateJoi.js'
];

requiredMiddlewares.forEach(middleware => {
    const exists = fs.existsSync(path.join(__dirname, '../src/middlewares', middleware));
    checks.push({
        name: `🔒 middlewares/${middleware}`,
        status: exists,
        required: true
    });
});

// ============================================
// 8. Verificar Prisma schemas
// ============================================
console.log('🗄️  Verificando Prisma schemas...');

const prismaDirs = ['auth', 'admin', 'inspecciones', 'checklists', 'notificaciones', 'archivos', 'alertas'];
prismaDirs.forEach(dir => {
    const exists = fs.existsSync(path.join(__dirname, `../src/modules/${dir}/prisma/schema.prisma`));
    checks.push({
        name: `🗄️  modules/${dir}/prisma/schema.prisma`,
        status: exists,
        required: true
    });
});

// ============================================
// 9. Verificar package.json dependencies
// ============================================
console.log('📦 Verificando dependencias...');

try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    const requiredDeps = [
        'express',
        '@prisma/client',
        'jsonwebtoken',
        'bcryptjs',
        'joi',
        'multer',
        'cloudinary',
        'puppeteer',
        'nodemailer',
        'swagger-jsdoc',
        'swagger-ui-express',
        'helmet',
        'cors',
        'morgan',
        'dotenv'
    ];

    requiredDeps.forEach(dep => {
        const exists = packageJson.dependencies && packageJson.dependencies[dep];
        checks.push({
            name: `📦 ${dep}`,
            status: !!exists,
            required: true
        });
    });
} catch (error) {
    console.error('❌ Error leyendo package.json:', error.message);
}

// ============================================
// MOSTRAR RESULTADOS
// ============================================
console.log('\n' + '='.repeat(60));
console.log('📊 RESULTADOS DE VERIFICACION');
console.log('='.repeat(60) + '\n');

let passed = 0;
let failed = 0;
let warnings = 0;

checks.forEach(check => {
    if (check.status) {
        console.log(`✅ ${check.name}`);
        passed++;
    } else if (check.required) {
        console.log(`❌ ${check.name}`);
        failed++;
    } else {
        console.log(`⚠️  ${check.name}`);
        warnings++;
    }
});

console.log('\n' + '='.repeat(60));
console.log(`✅ Pasaron: ${passed}`);
console.log(`❌ Fallaron: ${failed}`);
console.log(`⚠️  Advertencias: ${warnings}`);
console.log('='.repeat(60) + '\n');

if (failed === 0) {
    console.log('🎉 ¡BACKEND COMPLETAMENTE CONFIGURADO!\n');
    console.log('📝 Proximos pasos:\n');
    console.log('1. Configurar .env con tus credenciales');
    console.log('2. Ejecutar migraciones: node scripts/migrate-all.js');
    console.log('3. Cargar datos de prueba: node scripts/seed-all.js');
    console.log('4. Iniciar servidor: npm run dev');
    console.log('5. Abrir Swagger: http://localhost:4000/api/docs\n');
    process.exit(0);
} else {
    console.log('⚠️  Hay archivos faltantes. Revisa los errores arriba.\n');
    process.exit(1);
}
