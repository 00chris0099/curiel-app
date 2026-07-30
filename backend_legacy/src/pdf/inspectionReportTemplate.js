const config = require('../config');

const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

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
        return `<p style="color:#9ca3af; font-style:italic; font-size:10pt;">Sin evidencia fotográfica.</p>`;
    }
    return photos.map((photo) => `
        <div style="margin-bottom:8px; page-break-inside:avoid;">
            <img src="${photo.url}" alt="${escapeHtml(photo.caption || 'Evidencia fotografica')}" style="width:100%; max-height:200px; object-fit:contain; display:block; border:1px solid #e5e7eb;" />
            ${photo.caption ? `<p style="font-size:9pt; color:#6b7280; margin-top:3px;">${escapeHtml(photo.caption)}</p>` : ''}
        </div>
    `).join('');
};

const buildCoverLogo = (logoUrl) => {
    if (logoUrl) {
        return `<img src="${logoUrl}" alt="Logo CURIEL" style="height:32px; width:auto;" />`;
    }
    return `<span style="font-size:18pt; font-weight:700; letter-spacing:0.05em; color:#1f2937;">CURIEL</span>`;
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

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <title>Informe de Inspeccion - ${escapeHtml(inspection.projectName)}</title>
    <style>
        @page {
            size: A4;
            margin: 18mm;
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
    </style>
</head>
<body>

    <!-- PORTADA -->
    <div style="padding-top:10mm; page-break-after:always;">
        <div style="margin-bottom:12mm;">
            ${buildCoverLogo(logoUrl)}
        </div>

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

    <!-- INSPECCION METRICA - CUADRO -->
    <div style="page-break-before:always;">
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

    <!-- SECCIONES POR AMBIENTE -->
    ${sections.map((section, idx) => {
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
            <div style="page-break-before:always;">
                <h2 style="font-size:16pt; font-weight:700; text-transform:uppercase; color:#111827; letter-spacing:0.02em; margin-bottom:12px; padding-bottom:6px; border-bottom:2px solid #2563eb;">
                    ${escapeHtml(section.title)}
                </h2>
                ${observationBlocks}
            </div>
        `;
    }).join('')}

    <!-- RECOMENDACIONES -->
    <div style="page-break-before:always;">
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
    <div style="page-break-before:always;">
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
