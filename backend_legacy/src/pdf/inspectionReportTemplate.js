const path = require('path');
const fs = require('fs');
const config = require('../config');

const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/, '&#39;');

const formatDate = (value) => value ? new Date(value).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
}) : '---';

const formatDateTime = (value) => value ? new Date(value).toLocaleString('es-PE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
}) : '---';

const formatMetric = (value, suffix = '') => {
    if (value === null || value === undefined || value === '') return '---';
    const numeric = Number(value);
    return `${numeric.toFixed(2)}${suffix}`;
};

const BOX = 'border:1px solid #d1d5db; border-radius:4px; padding:12px 16px; margin-bottom:16px;';
const SECTION_TITLE = 'font-size:16pt; font-weight:700; color:#111827; margin-bottom:10px; padding-bottom:6px; border-bottom:2px solid #2563eb;';
const INFO_LABEL = 'font-weight:700; color:#374151; padding:4px 8px; background:#f9fafb; width:160px; vertical-align:top;';
const INFO_VALUE = 'padding:4px 8px; color:#1a1a1a;';

const LOGO_PATH = path.join(__dirname, 'logo-curiel.png');
let LOGO_BASE64 = '';
try {
    const buf = fs.readFileSync(LOGO_PATH);
    LOGO_BASE64 = 'data:image/png;base64,' + buf.toString('base64');
} catch {
    LOGO_BASE64 = '';
}

const WHATSAPP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

const EMAIL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>`;

const buildSectionModels = (areas, observations, photos) => {
    let observationCounter = 1;

    return areas.map((area) => {
        const areaObservations = observations
            .filter((obs) => obs.areaId === area.id)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            .map((obs) => ({
                ...obs,
                sequence: observationCounter++,
                photos: photos.filter((p) => p.observationId === obs.id)
            }));

        return {
            title: area.name.toUpperCase(),
            areas: [area],
            observations: areaObservations
        };
    });
};

const buildObservationPhotos = (photos) => {
    if (!photos || !photos.length) {
        return `<p style="color:#9ca3af; font-style:italic; font-size:10pt;">Sin evidencia fotografica.</p>`;
    }
    return photos.map((photo) => `
        <div style="margin-bottom:8px; page-break-inside:avoid;">
            <img src="${photo.url}" alt="${escapeHtml(photo.caption || 'Evidencia fotografica')}" style="width:100%; max-height:200px; object-fit:contain; display:block; border:1px solid #e5e7eb;" />
            ${photo.caption ? `<p style="font-size:9pt; color:#6b7280; margin-top:3px;">${escapeHtml(photo.caption)}</p>` : ''}
        </div>
    `).join('');
};

const buildInspectionReportHtml = (reportData) => {
    const {
        inspection,
        metadata,
        areas,
        observations,
        photos,
        summary,
        recommendations,
        inspectorSignature,
        logoUrl,
        generatedAt
    } = reportData;

    const buildingPhoto = photos.find((p) => p.type === 'edificio') || null;
    const planPhoto = photos.find((p) => p.type === 'plano') || null;
    const totalArea = areas.reduce((sum, area) => sum + Number(area.calculatedAreaM2 || 0), 0);
    const sections = buildSectionModels(areas, observations, photos);
    const inspectorName = inspection.inspector?.fullName
        || `${inspection.inspector?.firstName || ''} ${inspection.inspector?.lastName || ''}`.trim()
        || 'Sin asignar';
    const inspectorRole = inspection.inspector?.roles?.[0]?.name || inspection.inspector?.role || 'inspector';
    const capValue = inspection.inspector?.capNumber || inspection.inspector?.cap || inspection.inspector?.registrationNumber || null;
    const district = metadata.district || inspection.state || 'Lima';
    const address = metadata.exactAddress || inspection.address;
    const buildingName = metadata.buildingName || 'No registrado';
    const apartmentNumber = metadata.apartmentNumber || 'No registrado';
    const serviceType = metadata.serviceType || inspection.inspectionType;

    const wallWindowPercent = metadata.wallWindowPercent || metadata.pctMurosVanos || null;
    const complianceText = wallWindowPercent !== null
        ? `Cumple el area total del departamento con ${escapeHtml(String(wallWindowPercent))}% de muros y vanos, es aceptable.`
        : 'Cumple el area total del departamento, es aceptable.';

    const allRecommendations = [];
    const groups = ['pintura', 'estructura', 'instalaciones', 'acabados'];
    groups.forEach((group) => {
        const items = recommendations[group] || [];
        items.forEach((item) => allRecommendations.push(item));
    });
    const manualRecs = (summary?.finalRecommendations || '')
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean);
    manualRecs.forEach((item) => allRecommendations.push(item));

    const logoSrc = logoUrl || LOGO_BASE64;

    const FOOTER_HTML = `
        <div style="position:fixed; bottom:0; left:0; right:0; height:55px; overflow:hidden; z-index:100;">
            <svg viewBox="0 0 827 55" preserveAspectRatio="none" style="width:100%; height:100%; display:block;">
                <path d="M0,20 C100,10 200,5 350,12 C500,19 650,35 827,10 L827,55 L0,55 Z" fill="#e57a1a"/>
                <path d="M0,25 C150,15 300,8 500,18 C650,26 750,38 827,20 L827,55 L0,55 Z" fill="#d4710f"/>
                <path d="M0,30 C120,22 280,15 450,22 C600,28 730,40 827,25 L827,55 L0,55 Z" fill="#c0660a"/>
            </svg>
            <div style="position:absolute; bottom:12px; left:0; right:0; display:flex; justify-content:center; align-items:center; gap:32px; font-size:9pt; color:#fff; font-weight:600;">
                <span style="display:flex; align-items:center; gap:6px;">${WHATSAPP_SVG} 983 893 067</span>
                <span style="display:flex; align-items:center; gap:6px;">${EMAIL_SVG} info@tudepacheck.com</span>
            </div>
        </div>
    `;

    const buildHeader = (pageNum) => `
        <div style="position:fixed; top:0; left:0; right:0; height:42px; display:flex; align-items:center; justify-content:space-between; padding:0 18mm; border-bottom:1px solid #e5e7eb; background:#fff; z-index:100;">
            <div style="display:flex; align-items:center;">
                ${logoSrc ? `<img src="${logoSrc}" alt="Logo" style="height:28px; width:auto;" />` : ''}
            </div>
            <div style="font-size:8.5pt; color:#6b7280; font-style:italic; text-align:center;">
                Protegemos la inversion de tu departamento
            </div>
            <div style="font-size:8.5pt; color:#9ca3af; white-space:nowrap;">
                Pagina ${pageNum}
            </div>
        </div>
    `;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <title>Informe de Inspeccion - ${escapeHtml(inspection.projectName)}</title>
    <style>
        @page {
            size: A4;
            margin: 48px 18mm 60px 18mm;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: Arial, Helvetica, sans-serif;
            color: #1a1a1a;
            font-size: 10.5pt;
            line-height: 1.4;
            background: #fff;
        }
        .page-break { page-break-before: always; }
        .header-fixed { position: fixed; top: 0; left: 0; right: 0; z-index: 100; }
        .footer-fixed { position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; }
    </style>
</head>
<body>

    ${FOOTER_HTML}

    <!-- PORTADA -->
    <div style="page-break-after:always;">
        ${buildHeader(1)}
        <div style="padding-top:18mm;"></div>

        <h1 style="font-size:26pt; font-weight:700; color:#111827; margin-bottom:6mm;">INFORME DE INSPECCION</h1>
        <p style="font-size:10.5pt; color:#6b7280; max-width:400px; margin-bottom:8mm; line-height:1.5;">
            Informe tecnico profesional elaborado con criterios inmobiliarios, metricos y fotograficos para revision tecnica integral del inmueble.
        </p>

        <!-- INFORMACION GENERAL - CUADRO -->
        <table style="width:100%; border-collapse:collapse; ${BOX}" cellpadding="0" cellspacing="0">
            <tr>
                <td colspan="2" style="${SECTION_TITLE} border-bottom:2px solid #2563eb;">INFORMACION GENERAL</td>
            </tr>
            <tr>
                <td style="${INFO_LABEL}">Cliente</td>
                <td style="${INFO_VALUE}">${escapeHtml(inspection.clientName)}</td>
            </tr>
            <tr>
                <td style="${INFO_LABEL}">Direccion</td>
                <td style="${INFO_VALUE}">${escapeHtml(address)}</td>
            </tr>
            <tr>
                <td style="${INFO_LABEL}">Distrito</td>
                <td style="${INFO_VALUE}">${escapeHtml(district)}</td>
            </tr>
            <tr>
                <td style="${INFO_LABEL}">Provincia</td>
                <td style="${INFO_VALUE}">Lima</td>
            </tr>
            <tr>
                <td style="${INFO_LABEL}">Edificio</td>
                <td style="${INFO_VALUE}">${escapeHtml(buildingName)}</td>
            </tr>
            <tr>
                <td style="${INFO_LABEL}">Fecha de inspeccion</td>
                <td style="${INFO_VALUE}">${escapeHtml(formatDate(inspection.scheduledDate))}</td>
            </tr>
            <tr>
                <td style="${INFO_LABEL}">Inmueble</td>
                <td style="${INFO_VALUE}">${escapeHtml(apartmentNumber)}</td>
            </tr>
            <tr>
                <td style="${INFO_LABEL}">Servicio</td>
                <td style="${INFO_VALUE}">${escapeHtml(serviceType)}</td>
            </tr>
        </table>

        ${buildingPhoto ? `
        <div style="border:1px solid #d1d5db; overflow:hidden; margin-top:6mm;">
            <img src="${buildingPhoto.url}" alt="Foto del edificio" style="width:100%; height:220px; object-fit:cover; display:block;" />
        </div>
        ` : `
        <div style="width:100%; height:180px; display:flex; align-items:center; justify-content:center; color:#9ca3af; font-style:italic; background:#f9fafb; border:1px solid #e5e7eb;">
            Foto del edificio no disponible
        </div>
        `}

        <div style="margin-top:auto; padding-top:10mm; border-top:1px solid #d1d5db; display:flex; justify-content:space-between; font-size:9pt; color:#9ca3af;">
            <span>Generado: ${escapeHtml(formatDateTime(generatedAt))}</span>
            <span>${escapeHtml(config.pdf.companyTagline)}</span>
        </div>
    </div>

    <!-- INSPECCION METRICA - SPLIT: tabla izquierda + plano derecha -->
    <div class="page-break">
        ${buildHeader(2)}
        <div style="padding-top:18mm;"></div>

        <div style="display:flex; gap:16px; align-items:flex-start;">
            <!-- Left: Metric Table (50%) -->
            <div style="width:50%;">
                <table style="width:100%; border-collapse:collapse; ${BOX}" cellpadding="0" cellspacing="0">
                    <tr>
                        <td colspan="2" style="${SECTION_TITLE}">INSPECCION METRICA</td>
                    </tr>
                    <tr style="background:#f9fafb;">
                        <td style="font-weight:700; text-transform:uppercase; font-size:9pt; color:#6b7280; padding:6px 8px; border-bottom:2px solid #d1d5db;">Ambiente</td>
                        <td style="font-weight:700; text-transform:uppercase; font-size:9pt; color:#6b7280; padding:6px 8px; border-bottom:2px solid #d1d5db; text-align:right;">Area (m2)</td>
                    </tr>
                    ${areas.map((area) => `
                    <tr>
                        <td style="padding:6px 8px; border-bottom:1px solid #e5e7eb;">${escapeHtml(area.name)}</td>
                        <td style="padding:6px 8px; border-bottom:1px solid #e5e7eb; text-align:right;">${escapeHtml(formatMetric(area.calculatedAreaM2))}</td>
                    </tr>
                    `).join('')}
                    <tr style="font-weight:700;">
                        <td style="padding:8px; border-top:2px solid #d1d5db; border-bottom:2px solid #d1d5db;">TOTAL</td>
                        <td style="padding:8px; border-top:2px solid #d1d5db; border-bottom:2px solid #d1d5db; text-align:right;">${escapeHtml(formatMetric(totalArea))}</td>
                    </tr>
                </table>
                <p style="font-size:9.5pt; color:#6b7280; font-style:italic;">
                    El area total corresponde a la suma de las mediciones individuales de cada ambiente inspeccionado.
                </p>
            </div>

            <!-- Right: Plan Photo (50%) -->
            <div style="width:50%; ${BOX} display:flex; flex-direction:column; align-items:center; justify-content:flex-start;">
                <p style="font-size:12pt; font-weight:700; color:#111827; margin-bottom:10px; text-align:center;">PLANO DEL INMUEBLE</p>
                ${planPhoto ? `
                    <img src="${planPhoto.url}" alt="Plano del inmueble" style="width:100%; max-height:320px; object-fit:contain; display:block; border:1px solid #e5e7eb;" />
                    ${planPhoto.caption ? `<p style="font-size:9pt; color:#6b7280; margin-top:6px; text-align:center;">${escapeHtml(planPhoto.caption)}</p>` : ''}
                ` : `
                    <div style="width:100%; height:240px; display:flex; align-items:center; justify-content:center; color:#9ca3af; font-style:italic; background:#f9fafb; border:1px solid #e5e7eb;">
                        Plano no disponible
                    </div>
                `}
            </div>
        </div>

        <!-- Compliance text -->
        <div style="margin-top:16px; padding:12px 16px; background:#f0fdf4; border:1px solid #86efac; border-radius:4px;">
            <p style="font-size:10.5pt; color:#166534; font-weight:600;">
                ${complianceText}
            </p>
        </div>
    </div>

    <!-- SECCIONES POR AMBIENTE -->
    ${sections.map((section) => {
        const observationBlocks = section.observations.length
            ? section.observations.map((obs) => `
                <div style="margin-bottom:16px; page-break-inside:avoid;">
                    <p style="font-size:10pt; font-weight:700; color:#374151; margin-bottom:4px;">Observacion ${obs.sequence}</p>
                    ${buildObservationPhotos(obs.photos)}
                    <p style="font-size:10.5pt; color:#1a1a1a; line-height:1.4; margin-bottom:4px;">${escapeHtml(obs.description)}</p>
                    <p style="font-size:9.5pt; color:#6b7280;">
                        <strong>Tipo:</strong> ${escapeHtml(obs.type)}
                        ${obs.severity ? ` &middot; <strong>Severidad:</strong> ${escapeHtml(obs.severity)}` : ''}
                        ${obs.metricValue ? ` &middot; <strong>Metrica:</strong> ${escapeHtml(formatMetric(obs.metricValue, obs.metricUnit ? ` ${obs.metricUnit}` : ''))}` : ''}
                        ${obs.recommendation ? ` &middot; <strong>Recomendacion:</strong> ${escapeHtml(obs.recommendation)}` : ''}
                    </p>
                </div>
            `).join('')
            : '<p style="color:#9ca3af; font-style:italic; font-size:10pt; padding:12px 0;">No se registraron observaciones tecnicas en esta seccion.</p>';

        return `
            <div class="page-break">
                ${buildHeader('X')}
                <div style="padding-top:18mm;"></div>
                <h2 style="font-size:16pt; font-weight:700; text-transform:uppercase; color:#111827; letter-spacing:0.02em; margin-bottom:12px; padding-bottom:6px; border-bottom:2px solid #2563eb;">
                    ${escapeHtml(section.title)}
                </h2>
                ${observationBlocks}
            </div>
        `;
    }).join('')}

    <!-- RECOMENDACIONES -->
    <div class="page-break">
        ${buildHeader('X')}
        <div style="padding-top:18mm;"></div>
        <table style="width:100%; border-collapse:collapse; ${BOX}" cellpadding="0" cellspacing="0">
            <tr>
                <td style="${SECTION_TITLE}">RECOMENDACIONES</td>
            </tr>
            <tr>
                <td style="padding:8px;">
                    ${allRecommendations.length
                        ? `<ul style="padding-left:20px;">
                            ${allRecommendations.map((rec) => `<li style="margin-bottom:8px; font-size:10.5pt; line-height:1.45;">${escapeHtml(rec)}</li>`).join('')}
                        </ul>`
                        : '<p style="color:#9ca3af; font-style:italic; font-size:10pt;">No se generaron recomendaciones automaticas.</p>'
                    }
                </td>
            </tr>
        </table>
    </div>

    <!-- CIERRE TECNICO - CUADRO -->
    <div class="page-break">
        ${buildHeader('X')}
        <div style="padding-top:18mm;"></div>
        <table style="width:100%; border-collapse:collapse; ${BOX}" cellpadding="0" cellspacing="0">
            <tr>
                <td colspan="2" style="${SECTION_TITLE}">CIERRE TECNICO</td>
            </tr>
            <tr>
                <td style="${INFO_LABEL}">Cliente</td>
                <td style="${INFO_VALUE}">${escapeHtml(inspection.clientName)}</td>
            </tr>
            <tr>
                <td style="${INFO_LABEL}">Direccion</td>
                <td style="${INFO_VALUE}">${escapeHtml(address)}</td>
            </tr>
            <tr>
                <td style="${INFO_LABEL}">Distrito</td>
                <td style="${INFO_VALUE}">${escapeHtml(district)}</td>
            </tr>
            <tr>
                <td style="${INFO_LABEL}">Fecha</td>
                <td style="${INFO_VALUE}">${escapeHtml(formatDate(inspection.scheduledDate))}</td>
            </tr>
            <tr>
                <td style="${INFO_LABEL}">Inmueble</td>
                <td style="${INFO_VALUE}">${escapeHtml(apartmentNumber)}</td>
            </tr>
        </table>

        <div style="${BOX}">
            <p style="font-size:10.5pt; line-height:1.5; margin-bottom:8mm; text-align:justify;">
                ${escapeHtml(summary?.generalConclusion || 'Sin conclusion general registrada.')}
            </p>
            <p style="font-size:9pt; color:#9ca3af; font-style:italic; margin-bottom:12mm;">
                Este informe consolida los hallazgos observados en la fecha de inspeccion y debe complementarse con las acciones correctivas correspondientes para el inmueble evaluado.
            </p>

            <p style="font-size:9.5pt; color:#6b7280; margin-bottom:12px;">
                El presente informe fue realizado e inspeccionado por:
            </p>
            ${inspectorSignature?.signatureUrl
                ? `<img src="${inspectorSignature.signatureUrl}" alt="Firma del inspector" style="max-height:80px; max-width:200px; object-fit:contain; margin-bottom:8px;" />`
                : `<p style="color:#9ca3af; font-style:italic; font-size:9.5pt; margin-bottom:8px;">Firma pendiente</p>`
            }
            <hr style="border:none; border-top:2px solid #1a1a1a; width:220px; margin-bottom:8px;" />
            <p style="font-size:10.5pt; font-weight:700; color:#1a1a1a;">${escapeHtml(inspectorName)}</p>
            <p style="font-size:9.5pt; color:#6b7280;">${escapeHtml(inspectorRole)}</p>
            ${inspectorRole === 'arquitecto' ? `<p style="font-size:9.5pt; color:#6b7280;">CAP: ${escapeHtml(capValue || 'No registrado')}</p>` : ''}
        </div>
    </div>

</body>
</html>
    `;
};

module.exports = {
    buildInspectionReportHtml
};
