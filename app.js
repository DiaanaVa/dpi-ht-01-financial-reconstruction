// Deployment source: connected Git repository.
const euro = value => new Intl.NumberFormat('en-IE', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0
}).format(value);

const title = key => key
  .replace(/([A-Z])/g, ' $1')
  .replace(/^./, c => c.toUpperCase())
  .replace('P P E', 'PPE')
  .replace('Ppe', 'PPE')
  .replace('C O G S', 'COGS');

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);

const totals = new Set([
  'grossProfit', 'netProfitBeforeTax', 'cashFromOperations',
  'cashFromInvesting', 'cashFromFinancing', 'netCashChange',
  'closingCash', 'totalAssets', 'totalLiabilities', 'equity',
  'totalLiabilitiesAndEquity'
]);

let decisionData = [];

function statementCard(name, data) {
  return `<article class="statement"><h3>${name}</h3>${Object.entries(data).map(([key, value]) =>
    `<div class="line-item ${totals.has(key) ? 'total' : ''}"><span>${title(key)}</span><strong class="${value < 0 ? 'negative' : ''}">${euro(value)}</strong></div>`
  ).join('')}</article>`;
}

function scheduleCard(name, data) {
  const rows = Object.entries(data).filter(([key, value]) =>
    key !== 'formula' && key !== 'note' && typeof value === 'number'
  );
  return `<article class="schedule"><h3>${title(name)}</h3>${rows.map(([key, value]) =>
    `<div class="line-item"><span>${title(key)}</span><strong>${euro(value)}</strong></div>`
  ).join('')}${data.formula ? `<p class="formula">${esc(data.formula)}</p>` : ''}${data.note ? `<p>${esc(data.note)}</p>` : ''}</article>`;
}

function renderMainDecisions() {
  const query = document.querySelector('#main-search').value.toLowerCase();
  const tier = document.querySelector('#main-tier').value;
  const confidence = document.querySelector('#main-confidence').value;
  const rows = decisionData.filter(decision =>
    (tier === 'all' || decision.reviewTier === tier) &&
    (confidence === 'all' || decision.confidence === confidence) &&
    JSON.stringify(decision).toLowerCase().includes(query)
  );

  document.querySelector('#main-result-count').textContent = `Showing ${rows.length} of ${decisionData.length} decisions`;
  document.querySelector('#main-decisions').innerHTML = rows.map(decision =>
    `<details class="decision"><summary><span class="decision-id">${esc(decision.id)}</span><span class="decision-question">${esc(decision.question)}</span><span class="pill ${decision.reviewTier === 'material_judgment' ? 'pending' : 'pass'}">${decision.reviewTier === 'material_judgment' ? 'Material' : 'Operational'}</span><span class="pill ${decision.confidence === 'low' ? 'unresolved' : decision.confidence === 'medium' ? 'pending' : 'pass'}">${esc(decision.confidence)}</span></summary><div class="decision-body"><h4>Final certified answer</h4><p>${esc(decision.answer)}</p>${decision.alternativeTreatment ? `<h4>Alternative treatment considered</h4><p>${esc(decision.alternativeTreatment)}</p>` : ''}<h4>Evidence</h4><ul class="evidence-list">${decision.evidence.map(item => `<li>${esc(item)}</li>`).join('')}</ul><h4>Certification</h4><span class="pill pass">${esc(decision.certificationStatus.replaceAll('_', ' '))}</span></div></details>`
  ).join('');
}

fetch('/submission.json')
  .then(response => {
    if (!response.ok) throw Error('Submission data unavailable');
    return response.json();
  })
  .then(data => {
    document.querySelector('#cert-status').textContent = data.certificationStatus.replaceAll('_', ' ');
    document.querySelector('#student-name').textContent = data.student.name || 'Not entered';
    document.querySelector('#student-id').textContent = data.student.id || 'Not entered';

    const balanceSheet = data.statements.balanceSheet;
    const profitAndLoss = data.statements.profitAndLoss;
    const cashFlow = data.statements.cashFlow;

    document.querySelector('#kpis').innerHTML = [
      ['Revenue', profitAndLoss.revenue],
      ['Net profit', profitAndLoss.netProfitBeforeTax],
      ['Closing cash', cashFlow.closingCash],
      ['Total assets', balanceSheet.totalAssets],
      ['Closing equity', balanceSheet.equity]
    ].map(([name, value]) => `<article class="kpi"><span>${name}</span><strong>${euro(value)}</strong></article>`).join('');

    document.querySelector('#statements').innerHTML =
      statementCard('Profit & Loss', profitAndLoss) +
      statementCard('Cash Flow', cashFlow) +
      statementCard('Balance Sheet', balanceSheet);

    document.querySelector('#reconciliations').innerHTML = data.reconciliations.map(item =>
      `<tr><td><strong>${esc(item.name)}</strong></td><td>${esc(item.calculation)}</td><td>${euro(item.difference)}</td><td><span class="pill ${item.status === 'PASS' ? 'pass' : 'unresolved'}">${esc(item.status)}</span></td></tr>`
    ).join('');

    document.querySelector('#schedules').innerHTML = Object.entries(data.schedules)
      .map(([name, schedule]) => scheduleCard(name, schedule)).join('');

    document.querySelector('#evidence').innerHTML = data.evidence.map(item =>
      `<tr><td><strong>${esc(item.file)}</strong></td><td>${esc(item.scope)}</td><td><span class="reliability">${esc(item.reliability)}</span></td></tr>`
    ).join('');

    decisionData = data.decisions;
    renderMainDecisions();

    document.querySelector('#uncertainties').innerHTML = data.uncertainties.map(item =>
      `<article class="uncertainty"><h3>${esc(item.issue)}</h3><p class="amount">${esc(item.amountOrRange)}</p><p><strong>Treatment:</strong> ${esc(item.treatment)}</p><p><strong>Evidence still needed:</strong> ${esc(item.evidenceNeeded)}</p><span class="pill ${item.confidence === 'low' ? 'unresolved' : 'pending'}">${esc(item.confidence)} confidence</span></article>`
    ).join('');

    const board = data.boardRecommendation;
    document.querySelector('#recommendation').innerHTML = `<p class="eyebrow">Board recommendation</p><h2>${esc(board.decision)}</h2><p>${esc(board.continueOperations)}</p><ol>${board.immediateActions.map(item => `<li>${esc(item)}</li>`).join('')}</ol>`;
  })
  .catch(error => {
    document.querySelector('#app').innerHTML = `<section class="panel"><h1>Unable to load the reconstruction</h1><p>${esc(error.message)}</p></section>`;
  });

['main-search', 'main-tier', 'main-confidence'].forEach(id =>
  document.querySelector(`#${id}`).addEventListener('input', renderMainDecisions)
);
