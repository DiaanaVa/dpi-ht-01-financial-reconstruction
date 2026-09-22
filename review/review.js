const euro = value => value === null || value === undefined
  ? 'Not separately quantified'
  : new Intl.NumberFormat('en-IE', {
      style: 'currency', currency: 'EUR', maximumFractionDigits: 0, signDisplay: 'exceptZero'
    }).format(value);

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);

const disagreementIds = new Set(['D013', 'D035', 'D038', 'D058', 'D072', 'D075', 'D089', 'D096']);
const unresolvedIds = new Set(['D075', 'D089']);
let all = [];

function render() {
  const query = document.querySelector('#search').value.toLowerCase();
  const tier = document.querySelector('#tier').value;
  const confidence = document.querySelector('#confidence').value;
  const focus = document.querySelector('#focus').value;

  const rows = all.filter(decision =>
    (tier === 'all' || decision.reviewTier === tier) &&
    (confidence === 'all' || decision.confidence === confidence) &&
    (
      focus === 'all' ||
      (focus === 'disagreement' && disagreementIds.has(decision.id)) ||
      (focus === 'changed' && decision.changedFromAI) ||
      (focus === 'low' && decision.confidence === 'low') ||
      (focus === 'unresolved' && unresolvedIds.has(decision.id))
    ) &&
    JSON.stringify(decision).toLowerCase().includes(query)
  );

  document.querySelector('#result-count').textContent = `Showing ${rows.length} of ${all.length} decisions`;
  document.querySelector('#decisions').innerHTML = rows.map(decision => {
    const flags = [
      disagreementIds.has(decision.id) ? '<span class="pill unresolved">Agent disagreement</span>' : '',
      decision.changedFromAI ? '<span class="pill changed">Changed from AI</span>' : '',
      unresolvedIds.has(decision.id) ? '<span class="pill unresolved">Unresolved</span>' : ''
    ].join('');

    const materialTrail = decision.reviewTier === 'material_judgment' ? `
      <div class="judgment-grid">
        <div class="judgment-box"><h4>First AI proposal</h4><p>${esc(decision.aiProposal)}</p></div>
        <div class="judgment-box"><h4>Independent challenge</h4><p>${esc(decision.independentChallenge)}</p></div>
      </div>
      <h4>Final student reasoning</h4><p>${esc(decision.studentReasoning)}</p>
      <h4>Statement effect</h4><div class="effect">${Object.entries(decision.statementEffect || {}).map(([key, value]) => `<span>${esc(key)}: ${euro(value)}</span>`).join('')}</div>
      <p class="changed-answer"><strong>Changed from first AI answer:</strong> ${decision.changedFromAI ? 'Yes' : 'No'}</p>` : '';

    return `<details class="decision ${disagreementIds.has(decision.id) ? 'has-disagreement' : ''} ${decision.changedFromAI ? 'has-change' : ''} ${unresolvedIds.has(decision.id) ? 'has-unresolved' : ''}"><summary><span class="decision-id">${esc(decision.id)}</span><span class="decision-question">${esc(decision.question)}</span><span class="pill ${decision.reviewTier === 'material_judgment' ? 'pending' : 'pass'}">${decision.reviewTier === 'material_judgment' ? 'Material' : 'Operational'}</span><span class="pill ${decision.confidence === 'low' ? 'unresolved' : decision.confidence === 'medium' ? 'pending' : 'pass'}">${esc(decision.confidence)}</span></summary><div class="decision-body"><div class="flag-row">${flags}</div><h4>Final certified answer</h4><p>${esc(decision.answer)}</p>${materialTrail}<h4>Evidence</h4><ul class="evidence-list">${decision.evidence.map(item => `<li>${esc(item)}</li>`).join('')}</ul><h4>Certification</h4><p><span class="pill pass">${esc(decision.certificationStatus.replaceAll('_', ' '))}</span></p></div></details>`;
  }).join('');
}

fetch('/submission.json')
  .then(response => {
    if (!response.ok) throw Error('Submission data unavailable');
    return response.json();
  })
  .then(data => {
    all = data.decisions;
    const material = all.filter(item => item.reviewTier === 'material_judgment');
    const changed = material.filter(item => item.changedFromAI);
    const low = all.filter(item => item.confidence === 'low');

    document.querySelector('#review-cert-status').textContent = data.certificationStatus.replaceAll('_', ' ');
    document.querySelector('#review-stats').innerHTML = `
      <article class="review-stat"><strong>${all.length}</strong><span>Total decisions</span></article>
      <article class="review-stat"><strong>${all.filter(item => item.reviewTier === 'operational').length}</strong><span>Operational</span></article>
      <article class="review-stat"><strong>${material.length}</strong><span>Material judgments</span></article>
      <article class="review-stat"><strong>${disagreementIds.size}</strong><span>Agent disagreements</span></article>
      <article class="review-stat"><strong>${changed.length}</strong><span>Changed from AI</span></article>
      <article class="review-stat"><strong>${low.length}</strong><span>Low confidence</span></article>`;

    document.querySelector('#review-uncertainties').innerHTML = `
      <div><p class="eyebrow">Unresolved uncertainty</p><h2>€9,000 inventory-count difference remains open</h2><p>Accounting inventory is €112,000; the physical saleable count is €121,000. No unsupported gain is recognized.</p></div>
      <a href="#decisions" class="button" data-filter-unresolved>Show linked decisions</a>`;

    document.querySelector('[data-filter-unresolved]').addEventListener('click', () => {
      document.querySelector('#focus').value = 'unresolved';
      render();
    });
    render();
  })
  .catch(error => {
    document.querySelector('#decisions').innerHTML = `<section class="panel"><p>${esc(error.message)}</p></section>`;
  });

['search', 'tier', 'confidence', 'focus'].forEach(id =>
  document.querySelector(`#${id}`).addEventListener('input', render)
);
