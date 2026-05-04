const config = require('../config');

const REPORT_SECTION_DEFINITIONS = [
    { title: 'Entrada y pasadizo', areaNames: ['Entrada'] },
    { title: 'Sala y comedor', areaNames: ['Sala', 'Comedor'] },
    { title: 'Dormitorios', areaNames: ['Dormitorio principal', 'Dormitorio secundario'] },
    { title: 'Baños', areaNames: ['Baño principal', 'Baño 2'] },
    { title: 'Cocina', areaNames: ['Kitchenette'] },
    { title: 'Balcón', areaNames: ['Balcón'] },
    { title: 'Estudio', areaNames: ['Estudio'] },
    { title: 'Centro de lavado', areaNames: ['Centro de lavado'] },
    { title: 'Muros y vanos', areaNames: ['Muros y vanos'] }
];

const severityLabels = {
    leve: 'Leve',
    media: 'Media',
    alta: 'Alta',
    critica: 'Crítico'
};

const severityClasses = {
    leve: 'badge-success',
    media: 'badge-warning',
    alta: 'badge-alert',
    critica: 'badge-critical'
};

const reportStatusLabels = {
    borrador: 'Borrador',
    listo_para_revision: 'Listo para revisión',
    aprobado: 'Aprobado'
};

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
}) : '-';

const formatDateTime = (value) => value ? new Date(value).toLocaleString('es-PE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
}) : '-';

const formatMetric = (value, suffix = '') => {
    if (value === null || value === undefined || value === '') {
        return '-';
    }

    const numeric = Number(value);
    return `${numeric.toFixed(2)}${suffix}`;
};

const buildSectionModels = (areas, observations, photos) => {
    let observationCounter = 1;

    const sections = REPORT_SECTION_DEFINITIONS.map((section) => {
        const sectionAreas = areas.filter((area) => section.areaNames.includes(area.name));
        const areaIds = sectionAreas.map((area) => area.id);
        const sectionObservations = observations
            .filter((observation) => areaIds.includes(observation.areaId))
            .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))
            .map((observation) => ({
                ...observation,
                sequence: observationCounter++,
                photos: photos.filter((photo) => photo.observationId === observation.id)
            }));

        const sectionPhotos = photos.filter((photo) => areaIds.includes(photo.areaId));
        const primaryPhoto = sectionPhotos[0] || sectionObservations.find((item) => item.photos[0])?.photos[0] || null;

        return {
            title: section.title,
            areas: sectionAreas,
            observations: sectionObservations,
            primaryPhoto,
            sectionPhotos
        };
    }).filter((section) => section.areas.length > 0 || section.observations.length > 0);

    const remainingAreas = areas.filter((area) => !REPORT_SECTION_DEFINITIONS.some((section) => section.areaNames.includes(area.name)));
    remainingAreas.forEach((area) => {
        const areaObservations = observations
            .filter((observation) => observation.areaId === area.id)
            .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))
            .map((observation) => ({
                ...observation,
                sequence: observationCounter++,
                photos: photos.filter((photo) => photo.observationId === observation.id)
            }));

        const areaPhotos = photos.filter((photo) => photo.areaId === area.id);

        sections.push({
            title: area.name,
            areas: [area],
            observations: areaObservations,
            primaryPhoto: areaPhotos[0] || areaObservations.find((item) => item.photos[0])?.photos[0] || null,
            sectionPhotos: areaPhotos
        });
    });

    return sections;
};

const buildRecommendationsMarkup = (recommendations) => {
    const groups = ['pintura', 'estructura', 'instalaciones', 'acabados'];

    return groups.map((group) => {
        const items = recommendations[group] || [];
        if (!items.length) {
            return '';
        }

        return `
            <div class="recommendation-group">
                <h4>${escapeHtml(group.charAt(0).toUpperCase() + group.slice(1))}</h4>
                <ul>
                    ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                </ul>
            </div>
        `;
    }).join('');
};

const placeholderImage = (label) => `
    <div class="image-placeholder">
        <span>${escapeHtml(label)}</span>
    </div>
`;

const buildPhotoGrid = (photos, columnsClass = 'photo-grid') => {
    if (!photos.length) {
        return placeholderImage('Sin evidencia fotográfica disponible');
    }

    return `
        <div class="${columnsClass}">
            ${photos.map((photo) => `
                <figure class="photo-card">
                    <img src="${photo.url}" alt="${escapeHtml(photo.caption || 'Fotografía de inspección')}" />
                    <figcaption>${escapeHtml(photo.caption || 'Registro fotográfico')}</figcaption>
                </figure>
            `).join('')}
        </div>
    `;
};

const buildSectionsMarkup = (sections) => {
    return sections.map((section) => {
        const observationMarkup = section.observations.length
            ? section.observations.map((observation) => `
                <article class="observation-card">
                    <div class="observation-head">
                        <div>
                            <p class="observation-index">Observación ${observation.sequence}</p>
                            <h4>${escapeHtml(observation.title)}</h4>
                        </div>
                        <span class="badge ${severityClasses[observation.severity] || 'badge-warning'}">${escapeHtml(severityLabels[observation.severity] || observation.severity)}</span>
                    </div>
                    <p class="observation-description">${escapeHtml(observation.description)}</p>
                    <p class="observation-meta"><strong>Tipo:</strong> ${escapeHtml(observation.type)}${observation.metricValue ? ` · <strong>Métrica:</strong> ${escapeHtml(formatMetric(observation.metricValue, observation.metricUnit ? ` ${observation.metricUnit}` : ''))}` : ''}</p>
                    ${observation.recommendation ? `<p class="observation-meta"><strong>Recomendación:</strong> ${escapeHtml(observation.recommendation)}</p>` : ''}
                    ${buildPhotoGrid(observation.photos, 'photo-grid compact')}
                </article>
            `).join('')
            : '<div class="empty-state">No se registraron observaciones técnicas en esta sección.</div>';

        return `
            <section class="report-section page-break">
                <div class="section-header">
                    <div>
                        <p class="eyebrow">Inspección por ambientes</p>
                        <h2>${escapeHtml(section.title)}</h2>
                    </div>
                    <div class="section-area-summary">
                        ${section.areas.map((area) => `
                            <span>${escapeHtml(area.name)} · ${escapeHtml(formatMetric(area.calculatedAreaM2, ' m²'))}</span>
                        `).join('')}
                    </div>
                </div>
                <div class="section-hero">
                    ${section.primaryPhoto ? `<img src="${section.primaryPhoto.url}" alt="${escapeHtml(section.primaryPhoto.caption || section.title)}" />` : placeholderImage(`Sin imagen principal de ${section.title}`)}
                </div>
                <div class="observations-grid">
                    ${observationMarkup}
                </div>
            </section>
        `;
    }).join('');
};

const buildMetricRows = (areas, totalArea) => `
    ${areas.map((area) => `
        <tr>
            <td>${escapeHtml(area.name)}</td>
            <td>${escapeHtml(formatMetric(area.calculatedAreaM2, ' m²'))}</td>
        </tr>
    `).join('')}
    <tr class="total-row">
        <td>TOTAL</td>
        <td>${escapeHtml(formatMetric(totalArea, ' m²'))}</td>
    </tr>
`;

const buildInspectorSignatureBlock = (inspector, signature) => {
    const roleLabel = inspector?.roles?.[0]?.name || inspector?.role || 'inspector';
    const capValue = inspector?.capNumber || inspector?.cap || inspector?.registrationNumber || null;

    return `
        <div class="signature-card">
            <div class="signature-image-wrap">
                ${signature?.signatureUrl
            ? `<img src="${signature.signatureUrl}" alt="Firma del inspector" class="signature-image" />`
            : '<div class="signature-placeholder">Firma pendiente</div>'}
            </div>
            <div class="signature-line"></div>
            <p class="signature-name">${escapeHtml(inspector?.fullName || inspector?.firstName || 'Inspector asignado')}</p>
            <p class="signature-role">${escapeHtml(roleLabel)}</p>
            ${roleLabel === 'arquitecto' ? `<p class="signature-cap">CAP: ${escapeHtml(capValue || 'No registrado')}</p>` : ''}
        </div>
    `;
};

const buildCoverLogo = (logoUrl) => {
    if (logoUrl) {
        return `<img src="${logoUrl}" alt="Logo CURIEL" class="brand-logo" />`;
    }

    return `
        <svg class="brand-logo" viewBox="0 0 220 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="CURIEL">
            <rect width="220" height="64" rx="18" fill="#f97316" />
            <text x="24" y="40" font-size="28" font-family="Arial, sans-serif" font-weight="700" fill="#ffffff">CURIEL</text>
        </svg>
    `;
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

    const buildingPhoto = photos.find((photo) => photo.type === 'edificio') || null;
    const planPhoto = photos.find((photo) => photo.type === 'plano') || null;
    const totalArea = areas.reduce((sum, area) => sum + Number(area.calculatedAreaM2 || 0), 0);
    const sections = buildSectionModels(areas, observations, photos);
    const automaticRecommendationsMarkup = buildRecommendationsMarkup(recommendations);
    const manualRecommendations = (summary?.finalRecommendations || '')
        .split(/\n+/)
        .map((item) => item.trim())
        .filter(Boolean);

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <title>Informe de inspección ${escapeHtml(inspection.projectName)}</title>
    <style>
        @page {
            size: A4;
            margin: 28mm 16mm 24mm;
        }
        * { box-sizing: border-box; }
        body {
            font-family: Arial, Helvetica, sans-serif;
            color: #1f2937;
            margin: 0;
            background: #ffffff;
            font-size: 12px;
            line-height: 1.55;
        }
        .cover {
            min-height: 240mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 8mm 2mm 4mm;
        }
        .cover-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
        }
        .brand-logo {
            width: 190px;
            height: auto;
        }
        .tagline {
            margin: 18px 0 0;
            color: #f97316;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            font-size: 12px;
        }
        .cover-title {
            margin: 12px 0 10px;
            font-size: 34px;
            line-height: 1.1;
            letter-spacing: -0.03em;
        }
        .cover-subtitle {
            color: #6b7280;
            max-width: 420px;
            font-size: 14px;
        }
        .cover-meta {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
            margin-top: 28px;
        }
        .meta-card {
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 14px 16px;
            background: #fff7ed;
        }
        .meta-card span {
            display: block;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-size: 10px;
            margin-bottom: 6px;
        }
        .cover-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #e5e7eb;
            padding-top: 16px;
            color: #6b7280;
        }
        .page-break {
            page-break-before: always;
        }
        .section-shell {
            margin-top: 18px;
        }
        .section-block {
            margin-bottom: 20px;
            border: 1px solid #e5e7eb;
            border-radius: 18px;
            padding: 18px;
            background: #ffffff;
        }
        .section-block h2 {
            margin: 0 0 14px;
            font-size: 20px;
        }
        .eyebrow {
            color: #f97316;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            font-size: 10px;
            margin: 0 0 8px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
        }
        .info-item {
            background: #f9fafb;
            border-radius: 14px;
            padding: 12px;
            border: 1px solid #edf2f7;
        }
        .info-item span {
            display: block;
            color: #9ca3af;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 4px;
        }
        .plan-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
        }
        .plan-card {
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            overflow: hidden;
            background: #f9fafb;
        }
        .plan-card h3 {
            margin: 0;
            padding: 12px 14px;
            font-size: 14px;
            border-bottom: 1px solid #e5e7eb;
            background: #ffffff;
        }
        .plan-card img, .section-hero img, .photo-card img {
            width: 100%;
            display: block;
            object-fit: cover;
        }
        .plan-card img {
            height: 230px;
        }
        .metric-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
        }
        .metric-table th,
        .metric-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e5e7eb;
            text-align: left;
        }
        .metric-table th {
            background: #fff7ed;
            color: #9a3412;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .metric-table .total-row td {
            font-weight: 700;
            background: #f9fafb;
        }
        .report-section {
            margin-bottom: 18px;
        }
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 18px;
            margin-bottom: 16px;
        }
        .section-header h2 {
            margin: 0;
            font-size: 22px;
        }
        .section-area-summary {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            justify-content: flex-end;
        }
        .section-area-summary span {
            border-radius: 999px;
            padding: 6px 10px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            font-size: 11px;
            color: #374151;
        }
        .section-hero {
            border-radius: 20px;
            overflow: hidden;
            border: 1px solid #e5e7eb;
            margin-bottom: 18px;
            min-height: 220px;
            background: #f9fafb;
        }
        .section-hero img {
            height: 260px;
        }
        .observations-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
        }
        .observation-card {
            border: 1px solid #e5e7eb;
            border-radius: 18px;
            padding: 16px;
            background: #ffffff;
        }
        .observation-head {
            display: flex;
            justify-content: space-between;
            gap: 14px;
            align-items: flex-start;
            margin-bottom: 10px;
        }
        .observation-head h4 {
            margin: 4px 0 0;
            font-size: 16px;
        }
        .observation-index {
            margin: 0;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #f97316;
            font-weight: 700;
        }
        .observation-description {
            margin: 0 0 8px;
        }
        .observation-meta {
            margin: 4px 0 10px;
            color: #4b5563;
        }
        .badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 82px;
            padding: 6px 10px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .badge-alert { background: #fed7aa; color: #c2410c; }
        .badge-critical { background: #fee2e2; color: #b91c1c; }
        .photo-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
        }
        .photo-grid.compact {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .photo-card {
            margin: 0;
            overflow: hidden;
            border-radius: 16px;
            border: 1px solid #e5e7eb;
            background: #ffffff;
        }
        .photo-card img {
            height: 150px;
        }
        .photo-card figcaption {
            padding: 10px;
            font-size: 11px;
            color: #4b5563;
        }
        .image-placeholder {
            width: 100%;
            min-height: 180px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: #9ca3af;
            background: repeating-linear-gradient(135deg, #f9fafb, #f9fafb 12px, #f3f4f6 12px, #f3f4f6 24px);
            border-radius: 16px;
            border: 1px dashed #d1d5db;
            text-align: center;
        }
        .recommendations-shell {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
        }
        .recommendation-group {
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 16px;
            background: #ffffff;
        }
        .recommendation-group h4 {
            margin: 0 0 10px;
            font-size: 14px;
            color: #ea580c;
        }
        .recommendation-group ul,
        .manual-recommendations ul {
            margin: 0;
            padding-left: 18px;
        }
        .recommendation-group li,
        .manual-recommendations li {
            margin-bottom: 8px;
        }
        .manual-recommendations {
            margin-top: 18px;
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 16px;
            background: #fff7ed;
        }
        .manual-recommendations h4 {
            margin: 0 0 10px;
            font-size: 14px;
            color: #9a3412;
        }
        .signature-grid {
            display: grid;
            grid-template-columns: 1.2fr 0.8fr;
            gap: 20px;
            align-items: end;
        }
        .signature-card {
            max-width: 320px;
        }
        .signature-image-wrap {
            min-height: 110px;
            display: flex;
            align-items: flex-end;
            justify-content: flex-start;
            padding-bottom: 10px;
        }
        .signature-image {
            max-height: 90px;
            max-width: 240px;
            object-fit: contain;
        }
        .signature-placeholder {
            color: #9ca3af;
            font-style: italic;
        }
        .signature-line {
            border-top: 1px solid #1f2937;
            margin-bottom: 8px;
        }
        .signature-name,
        .signature-role,
        .signature-cap {
            margin: 4px 0;
        }
        .footer-note {
            color: #6b7280;
        }
        .empty-state {
            border: 1px dashed #d1d5db;
            border-radius: 16px;
            padding: 18px;
            text-align: center;
            color: #9ca3af;
            background: #f9fafb;
        }
    </style>
</head>
<body>
    <section class="cover">
        <div>
            <div class="cover-top">
                <div>
                    ${buildCoverLogo(logoUrl)}
                    <p class="tagline">${escapeHtml(config.pdf.companyTagline)}</p>
                </div>
            </div>
            <h1 class="cover-title">INFORME DE INSPECCIÓN</h1>
            <p class="cover-subtitle">Informe técnico profesional para inspección de departamentos en Lima, elaborado con criterios inmobiliarios, métricos y fotográficos para revisión técnica integral.</p>

            <div class="cover-meta">
                <div class="meta-card">
                    <span>Cliente</span>
                    <strong>${escapeHtml(inspection.clientName)}</strong>
                </div>
                <div class="meta-card">
                    <span>Inspección</span>
                    <strong>${escapeHtml(inspection.projectName)}</strong>
                </div>
                <div class="meta-card">
                    <span>Distrito</span>
                    <strong>${escapeHtml(metadata.district || inspection.state || 'Lima')}</strong>
                </div>
                <div class="meta-card">
                    <span>Fecha</span>
                    <strong>${escapeHtml(formatDate(inspection.scheduledDate))}</strong>
                </div>
            </div>
        </div>

        <div class="cover-footer">
            <span>Generado: ${escapeHtml(formatDateTime(generatedAt))}</span>
            <span>Estado del informe: ${escapeHtml(reportStatusLabels[summary?.reportStatus] || 'Borrador')}</span>
        </div>
    </section>

    <section class="section-shell page-break">
        <div class="section-block">
            <p class="eyebrow">1. Información general</p>
            <h2>Ficha de inspección</h2>
            <div class="info-grid">
                <div class="info-item"><span>Cliente</span><strong>${escapeHtml(inspection.clientName)}</strong></div>
                <div class="info-item"><span>Dirección</span><strong>${escapeHtml(metadata.exactAddress || inspection.address)}</strong></div>
                <div class="info-item"><span>Distrito</span><strong>${escapeHtml(metadata.district || inspection.state || 'Lima')}</strong></div>
                <div class="info-item"><span>Provincia</span><strong>Lima</strong></div>
                <div class="info-item"><span>Edificio</span><strong>${escapeHtml(metadata.buildingName || 'No registrado')}</strong></div>
                <div class="info-item"><span>Fecha de inspección</span><strong>${escapeHtml(formatDate(inspection.scheduledDate))}</strong></div>
                <div class="info-item"><span>Departamento</span><strong>${escapeHtml(metadata.apartmentNumber || 'No registrado')}</strong></div>
                <div class="info-item"><span>Inspector</span><strong>${escapeHtml(inspection.inspector?.fullName || `${inspection.inspector?.firstName || ''} ${inspection.inspector?.lastName || ''}`.trim() || 'Sin asignar')}</strong></div>
                <div class="info-item"><span>Servicio</span><strong>${escapeHtml(metadata.serviceType || inspection.inspectionType)}</strong></div>
            </div>
        </div>

        <div class="section-block">
            <p class="eyebrow">2. Plano de ubicación</p>
            <h2>Registro visual inicial</h2>
            <div class="plan-grid">
                <div class="plan-card">
                    <h3>Edificio / fachada</h3>
                    ${buildingPhoto ? `<img src="${buildingPhoto.url}" alt="Foto del edificio" />` : placeholderImage('Sin foto del edificio')}
                </div>
                <div class="plan-card">
                    <h3>Plano del departamento</h3>
                    ${planPhoto ? `<img src="${planPhoto.url}" alt="Plano del inmueble" />` : placeholderImage('Sin foto del plano')}
                </div>
            </div>
        </div>

        <div class="section-block">
            <p class="eyebrow">3. Inspección métrica</p>
            <h2>Tabla de áreas medidas</h2>
            <table class="metric-table">
                <thead>
                    <tr>
                        <th>Área</th>
                        <th>m²</th>
                    </tr>
                </thead>
                <tbody>
                    ${buildMetricRows(areas, totalArea)}
                </tbody>
            </table>
        </div>
    </section>

    ${buildSectionsMarkup(sections)}

    <section class="page-break section-block">
        <p class="eyebrow">4. Recomendaciones</p>
        <h2>Acciones sugeridas</h2>
        <div class="recommendations-shell">
            ${automaticRecommendationsMarkup || '<div class="empty-state">No se generaron recomendaciones automáticas.</div>'}
        </div>
        ${manualRecommendations.length ? `
            <div class="manual-recommendations">
                <h4>Recomendaciones complementarias del inspector</h4>
                <ul>
                    ${manualRecommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
    </section>

    <section class="page-break section-block">
        <p class="eyebrow">5. Cierre técnico</p>
        <h2>Conclusión y firma</h2>
        <div class="signature-grid">
            <div>
                <p>${escapeHtml(summary?.generalConclusion || 'Sin conclusión general registrada.')}</p>
                <p class="footer-note">Este informe consolida hallazgos observados en la fecha de inspección y debe complementarse con las acciones correctivas señaladas para el inmueble evaluado.</p>
            </div>
            ${buildInspectorSignatureBlock(inspection.inspector, inspectorSignature)}
        </div>
    </section>
</body>
</html>
    `;
};

module.exports = {
    buildInspectionReportHtml
};
