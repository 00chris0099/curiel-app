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
        <div class="obs-photo-block">
            <img src="${photo.url}" alt="${escapeHtml(photo.caption || 'Evidencia fotográfica')}" />
            ${photo.caption ? `<p class="obs-photo-caption">${escapeHtml(photo.caption)}</p>` : ''}
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
    <title>Informe de Inspección - ${escapeHtml(inspection.projectName)}</title>
    <style>
        @page {
            size: A4;
            margin: 20mm;
            @top-left {
                content: "";
            }
            @top-right {
                content: "";
            }
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: Arial, Helvetica, sans-serif;
            color: #1a1a1a;
            font-size: 10.5pt;
            line-height: 1.35;
            background: #ffffff;
        }

        /* ── Header repetido en todas las páginas ── */
        .page-header {
            position: running(header);
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 8px;
            border-bottom: 0.5pt solid #d1d5db;
            margin-bottom: 16px;
            font-size: 9pt;
            color: #6b7280;
        }
        .page-header .header-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .page-header .header-tagline {
            font-size: 8pt;
            color: #9ca3af;
            letter-spacing: 0.05em;
        }
        .page-header .header-page {
            font-size: 9pt;
            color: #6b7280;
        }

        /* ── Portada ── */
        .cover {
            page-break-after: always;
            padding-top: 20mm;
        }
        .cover-title {
            font-size: 26pt;
            font-weight: 700;
            color: #111827;
            letter-spacing: -0.02em;
            margin-bottom: 6mm;
        }
        .cover-subtitle {
            font-size: 10.5pt;
            color: #6b7280;
            max-width: 400px;
            margin-bottom: 8mm;
            line-height: 1.5;
        }
        .info-block {
            margin-bottom: 6mm;
        }
        .info-block-title {
            font-size: 10pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #374151;
            border-bottom: 0.5pt solid #d1d5db;
            padding-bottom: 3px;
            margin-bottom: 4mm;
        }
        .info-row {
            display: flex;
            margin-bottom: 2mm;
            font-size: 10.5pt;
        }
        .info-label {
            width: 140px;
            flex-shrink: 0;
            font-weight: 700;
            color: #374151;
        }
        .info-value {
            color: #1a1a1a;
        }
        .cover-plan {
            margin-top: 6mm;
            border: 0.5pt solid #d1d5db;
            overflow: hidden;
        }
        .cover-plan img {
            width: 100%;
            height: 220px;
            object-fit: cover;
            display: block;
        }
        .cover-plan-placeholder {
            width: 100%;
            height: 220px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #9ca3af;
            font-style: italic;
            background: #f9fafb;
        }
        .cover-footer {
            margin-top: auto;
            padding-top: 10mm;
            border-top: 0.5pt solid #d1d5db;
            display: flex;
            justify-content: space-between;
            font-size: 9pt;
            color: #9ca3af;
        }

        /* ── Tabla de áreas ── */
        .metric-section {
            page-break-after: always;
        }
        .section-title {
            font-size: 18pt;
            font-weight: 700;
            color: #111827;
            margin-bottom: 4mm;
        }
        .metric-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 4mm;
        }
        .metric-table th,
        .metric-table td {
            padding: 3mm 4mm;
            border-bottom: 0.5pt solid #e5e7eb;
            text-align: left;
            font-size: 10.5pt;
        }
        .metric-table th {
            font-weight: 700;
            text-transform: uppercase;
            font-size: 9pt;
            letter-spacing: 0.05em;
            color: #6b7280;
            border-bottom: 1pt solid #d1d5db;
        }
        .metric-table td:last-child {
            text-align: right;
        }
        .metric-table th:last-child {
            text-align: right;
        }
        .metric-table .total-row td {
            font-weight: 700;
            border-top: 1pt solid #d1d5db;
            border-bottom: 1pt solid #d1d5db;
        }
        .metric-note {
            font-size: 9.5pt;
            color: #6b7280;
            font-style: italic;
        }

        /* ── Secciones por ambiente ── */
        .environment-section {
            page-break-before: auto;
        }
        .environment-section:first-of-type {
            page-break-before: always;
        }
        .environment-title {
            font-size: 16pt;
            font-weight: 700;
            text-transform: uppercase;
            color: #111827;
            letter-spacing: 0.02em;
            margin-bottom: 5mm;
            padding-bottom: 2mm;
            border-bottom: 0.5pt solid #d1d5db;
        }
        .observation-block {
            margin-bottom: 5mm;
            page-break-inside: avoid;
        }
        .observation-number {
            font-size: 10pt;
            font-weight: 700;
            color: #374151;
            margin-bottom: 1mm;
        }
        .obs-photo-block {
            margin-bottom: 2mm;
            page-break-inside: avoid;
        }
        .obs-photo-block img {
            width: 100%;
            max-height: 200px;
            object-fit: contain;
            display: block;
            border: 0.5pt solid #e5e7eb;
        }
        .obs-photo-caption {
            font-size: 9pt;
            color: #6b7280;
            margin-top: 1mm;
        }
        .observation-text {
            font-size: 10.5pt;
            color: #1a1a1a;
            line-height: 1.4;
            margin-bottom: 1mm;
        }
        .observation-detail {
            font-size: 9.5pt;
            color: #6b7280;
        }
        .observation-detail strong {
            color: #374151;
        }
        .no-observations {
            color: #9ca3af;
            font-style: italic;
            font-size: 10pt;
            padding: 4mm 0;
        }

        /* ── Recomendaciones ── */
        .recommendations-section {
            page-break-before: always;
        }
        .recommendations-list {
            list-style: disc;
            padding-left: 6mm;
        }
        .recommendations-list li {
            margin-bottom: 3mm;
            font-size: 10.5pt;
            line-height: 1.45;
        }

        /* ── Cierre ── */
        .closing-section {
            page-break-before: always;
        }
        .closing-conclusion {
            font-size: 10.5pt;
            line-height: 1.5;
            margin-bottom: 8mm;
            text-align: justify;
        }
        .closing-note {
            font-size: 9pt;
            color: #9ca3af;
            font-style: italic;
            margin-bottom: 12mm;
        }
        .closing-info {
            margin-bottom: 8mm;
        }
        .signature-block {
            margin-top: 12mm;
            page-break-inside: avoid;
        }
        .signature-image {
            max-height: 80px;
            max-width: 200px;
            object-fit: contain;
            margin-bottom: 2mm;
        }
        .signature-placeholder {
            color: #9ca3af;
            font-style: italic;
            font-size: 9.5pt;
            margin-bottom: 2mm;
        }
        .signature-line {
            border-top: 0.5pt solid #1a1a1a;
            width: 220px;
            margin-bottom: 2mm;
        }
        .signature-name {
            font-size: 10.5pt;
            font-weight: 700;
            color: #1a1a1a;
        }
        .signature-role {
            font-size: 9.5pt;
            color: #6b7280;
        }
        .signature-cap {
            font-size: 9.5pt;
            color: #6b7280;
        }
    </style>
</head>
<body>

    <!-- ═══════════ PORTADA ═══════════ -->
    <section class="cover">
        <div>
            <div style="margin-bottom: 12mm;">
                ${buildCoverLogo(logoUrl)}
            </div>

            <h1 class="cover-title">INFORME DE INSPECCIÓN</h1>
            <p class="cover-subtitle">
                Informe técnico profesional elaborado con criterios inmobiliarios, métricos y fotográficos para revisión técnica integral del inmueble.
            </p>

            <div class="info-block">
                <p class="info-block-title">Información General</p>
                <div class="info-row">
                    <span class="info-label">Cliente</span>
                    <span class="info-value">${escapeHtml(inspection.clientName)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Dirección</span>
                    <span class="info-value">${escapeHtml(address)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Distrito</span>
                    <span class="info-value">${escapeHtml(district)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Provincia</span>
                    <span class="info-value">Lima</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Edificio</span>
                    <span class="info-value">${escapeHtml(buildingName)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Fecha de inspección</span>
                    <span class="info-value">${escapeHtml(formatDate(inspection.scheduledDate))}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Inmueble</span>
                    <span class="info-value">${escapeHtml(apartmentNumber)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Servicio</span>
                    <span class="info-value">${escapeHtml(serviceType)}</span>
                </div>
            </div>

            <div class="cover-plan">
                ${buildingPhoto
                    ? `<img src="${buildingPhoto.url}" alt="Plano de ubicación" />`
                    : `<div class="cover-plan-placeholder">Plano de ubicación no disponible</div>`
                }
            </div>
        </div>

        <div class="cover-footer">
            <span>Generado: ${escapeHtml(formatDateTime(generatedAt))}</span>
            <span>${escapeHtml(config.pdf.companyTagline)}</span>
        </div>
    </section>

    <!-- ═══════════ INSPECCIÓN MÉTRICA ═══════════ -->
    <section class="metric-section">
        <h2 class="section-title">INSPECCIÓN MÉTRICA</h2>
        <table class="metric-table">
            <thead>
                <tr>
                    <th>Ambiente</th>
                    <th>Área (m²)</th>
                </tr>
            </thead>
            <tbody>
                ${areas.map((area) => `
                    <tr>
                        <td>${escapeHtml(area.name)}</td>
                        <td>${escapeHtml(formatMetric(area.calculatedAreaM2))}</td>
                    </tr>
                `).join('')}
                <tr class="total-row">
                    <td>TOTAL</td>
                    <td>${escapeHtml(formatMetric(totalArea))}</td>
                </tr>
            </tbody>
        </table>
        <p class="metric-note">
            El área total corresponde a la suma de las mediciones individuales de cada ambiente inspeccionado.
        </p>
    </section>

    <!-- ═══════════ SECCIONES POR AMBIENTE ═══════════ -->
    ${sections.map((section) => {
        const observationBlocks = section.observations.length
            ? section.observations.map((obs) => `
                <div class="observation-block">
                    <p class="observation-number">Observación ${obs.sequence}</p>
                    ${buildObservationPhotos(obs.photos)}
                    <p class="observation-text">${escapeHtml(obs.description)}</p>
                    <p class="observation-detail">
                        <strong>Tipo:</strong> ${escapeHtml(obs.type)}
                        ${obs.severity ? ` · <strong>Severidad:</strong> ${escapeHtml(obs.severity)}` : ''}
                        ${obs.metricValue ? ` · <strong>Métrica:</strong> ${escapeHtml(formatMetric(obs.metricValue, obs.metricUnit ? ` ${obs.metricUnit}` : ''))}` : ''}
                        ${obs.recommendation ? ` · <strong>Recomendación:</strong> ${escapeHtml(obs.recommendation)}` : ''}
                    </p>
                </div>
            `).join('')
            : '<p class="no-observations">No se registraron observaciones técnicas en esta sección.</p>';

        return `
            <section class="environment-section">
                <h2 class="environment-title">${escapeHtml(section.title)}</h2>
                ${section.areas.length > 1 ? `
                    <p class="observation-detail" style="margin-bottom:6mm;">
                        ${section.areas.map((a) => `${escapeHtml(a.name)}: ${escapeHtml(formatMetric(a.calculatedAreaM2))} m²`).join(' · ')}
                    </p>
                ` : ''}
                ${observationBlocks}
            </section>
        `;
    }).join('')}

    <!-- ═══════════ RECOMENDACIONES ═══════════ -->
    <section class="recommendations-section">
        <h2 class="section-title">RECOMENDACIONES</h2>
        ${allRecommendations.length
            ? `<ul class="recommendations-list">
                ${allRecommendations.map((rec) => `<li>${escapeHtml(rec)}</li>`).join('')}
            </ul>`
            : '<p class="no-observations">No se generaron recomendaciones automáticas.</p>'
        }
    </section>

    <!-- ═══════════ CIERRE TÉCNICO ═══════════ -->
    <section class="closing-section">
        <h2 class="section-title">CIERRE TÉCNICO</h2>

        <div class="closing-info">
            <p class="info-block-title">Información del Inmueble</p>
            <div class="info-row">
                <span class="info-label">Cliente</span>
                <span class="info-value">${escapeHtml(inspection.clientName)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Dirección</span>
                <span class="info-value">${escapeHtml(address)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Distrito</span>
                <span class="info-value">${escapeHtml(district)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Provincia</span>
                <span class="info-value">Lima</span>
            </div>
            <div class="info-row">
                <span class="info-label">Fecha</span>
                <span class="info-value">${escapeHtml(formatDate(inspection.scheduledDate))}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Inmueble</span>
                <span class="info-value">${escapeHtml(apartmentNumber)}</span>
            </div>
        </div>

        <p class="closing-conclusion">
            ${escapeHtml(summary?.generalConclusion || 'Sin conclusión general registrada.')}
        </p>
        <p class="closing-note">
            Este informe consolida los hallazgos observados en la fecha de inspección y debe complementarse con las acciones correctivas correspondientes para el inmueble evaluado.
        </p>

        <div class="signature-block">
            <p style="font-size:9.5pt; color:#6b7280; margin-bottom:4mm;">
                El presente informe fue realizado e inspeccionado por:
            </p>
            ${inspectorSignature?.signatureUrl
                ? `<img src="${inspectorSignature.signatureUrl}" alt="Firma del inspector" class="signature-image" />`
                : `<div class="signature-placeholder">Firma pendiente</div>`
            }
            <div class="signature-line"></div>
            <p class="signature-name">${escapeHtml(inspectorName)}</p>
            <p class="signature-role">${escapeHtml(inspectorRole)}</p>
            ${inspectorRole === 'arquitecto' ? `<p class="signature-cap">CAP: ${escapeHtml(capValue || 'No registrado')}</p>` : ''}
        </div>
    </section>

</body>
</html>
    `;
};

module.exports = {
    buildInspectionReportHtml
};
