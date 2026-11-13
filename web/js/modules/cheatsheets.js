// CS Interactive Workshop - Theory & Cheatsheets Module
class CheatsheetsStation {
  constructor() {
    this.parallelFraction = 0.85;
    this.processorCount = 8;
  }

  init() {
    this.setupAmdahlCalculator();
  }

  setupAmdahlCalculator() {
    const fractionSlider = document.getElementById('amdahlFraction');
    const procSlider = document.getElementById('amdahlProcessors');

    const updateCalc = () => {
      const f = parseFloat(fractionSlider.value) / 100;
      const n = parseInt(procSlider.value);
      this.parallelFraction = f;
      this.processorCount = n;

      document.getElementById('amdahlFractionVal').textContent = `${(f * 100).toFixed(0)}%`;
      document.getElementById('amdahlProcVal').textContent = T(`${n} núcleos`, `${n} core${n === 1 ? '' : 's'}`);

      // Amdahl's formula: S(n) = 1 / ((1 - f) + f / n)
      const speedup = 1 / ((1 - f) + f / n);
      const maxSpeedup = f === 1 ? Infinity : 1 / (1 - f);
      const efficiency = (speedup / n) * 100;

      document.getElementById('amdahlSpeedupVal').textContent = `${speedup.toFixed(2)}x`;
      document.getElementById('amdahlMaxSpeedupVal').textContent = maxSpeedup === Infinity ? '∞' : `${maxSpeedup.toFixed(2)}x`;
      document.getElementById('amdahlEfficiencyVal').textContent = `${efficiency.toFixed(1)}%`;
    };

    if (fractionSlider && procSlider) {
      fractionSlider.addEventListener('input', updateCalc);
      procSlider.addEventListener('input', updateCalc);
      const mark = () => { if (window.account) window.account.record('cheatsheets', 'amdahl'); };
      fractionSlider.addEventListener('change', mark);
      procSlider.addEventListener('change', mark);
      updateCalc();
    }
  }
}

window.cheatsheetsStation = new CheatsheetsStation();
