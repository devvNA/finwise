import {
  calculateCreditCard,
  calculateLoan,
  calculatePayLaterPlans,
  calculatePindar,
  generateAmortization,
  numberValue,
} from "./calculator.js";
import {
  calculateAffordability,
  calculateDashboard,
  calculateEmergencyFund,
  calculateRecommendation,
} from "./finance.js";
import { compareOffers } from "./comparison.js";
import { deleteSimulation, load, save, saveSimulation } from "./storage.js";

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const thousands = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const rawMoney = (value) => String(value ?? "").replace(/\D/g, "");
const formatMoneyInput = (value) => {
  const raw = rawMoney(value);
  return raw ? thousands.format(Number(raw)) : "";
};
const formData = (form) => {
  const values = Object.fromEntries(new FormData(form).entries());
  $$("[data-money]", form).forEach((field) => {
    values[field.name] = rawMoney(field.value);
  });
  return values;
};
const money = (value) => currency.format(Number.isFinite(value) ? value : 0);
const percent = (value) => `${Math.max(0, value || 0).toFixed(1).replace(".0", "")}%`;

const defaultFinance = {
  income: 3000000,
  essentials: 1500000,
  recurring: 300000,
  existingInstallments: 0,
  savings: 300000,
  buffer: 200000,
  targetRatio: 15,
};

const app = {
  dashboard: null,
  affordability: null,
  emergency: null,
  loan: null,
  schedule: [],
  offers: load("offers", [
    { name: "PayLater A", downPayment: 2000000, principal: 3000000, tenor: 6, rate: 0, method: "flat", adminFee: 0, serviceFee: 60000, insuranceFee: 0, extraFee: 0 },
    { name: "Kartu Kredit A", downPayment: 0, principal: 5000000, tenor: 6, rate: 1.5, method: "annuity", adminFee: 0, serviceFee: 0, insuranceFee: 0, extraFee: 0 },
    { name: "Multifinance A", downPayment: 1500000, principal: 3500000, tenor: 12, rate: 1.2, method: "flat", adminFee: 100000, serviceFee: 0, insuranceFee: 75000, extraFee: 0 },
  ]),
};

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function populateForm(form, values) {
  Object.entries(values || {}).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field && value !== undefined) {
      field.value = field.dataset.money === "" ? formatMoneyInput(value) : value;
    }
  });
}

function getFinanceInput(form) {
  const values = formData(form);
  const targetRatio =
    values.targetRatio === "custom" ? values.customRatio : values.targetRatio;
  return { ...defaultFinance, ...values, targetRatio: numberValue(targetRatio, 15) };
}

function syncFinanceForms(source) {
  const values = getFinanceInput(source);
  const targets = [$("#dashboard-form"), $("#affordability-form")].filter(
    (form) => form && form !== source
  );
  targets.forEach((target) => {
    ["income", "essentials", "recurring", "existingInstallments", "savings", "targetRatio"].forEach(
      (name) => {
        const field = target.elements.namedItem(name);
        if (field) {
          field.value = field.dataset.money === "" ? formatMoneyInput(values[name]) : values[name];
        }
      }
    );
  });
}

function toggleCustomFields() {
  const affordabilityForm = $("#affordability-form");
  const loanForm = $("#loan-form");
  $(".custom-ratio", affordabilityForm).classList.toggle(
    "hidden",
    affordabilityForm.elements.targetRatio.value !== "custom"
  );
  $(".custom-interval", loanForm).classList.toggle(
    "hidden",
    loanForm.elements.intervalDays.value !== "custom"
  );
}

function updateDashboard() {
  app.dashboard = calculateDashboard(getFinanceInput($("#dashboard-form")));
  const result = app.dashboard;
  $("#residual-income").textContent = money(result.residualIncome);
  $("#expense-ratio").textContent = percent(result.expenseRatio);
  $("#legend-essential").textContent = money(result.essentials);
  $("#legend-recurring").textContent = money(result.recurring);
  $("#legend-saving").textContent = money(result.savings);
  $("#capacity-amount").textContent = money(result.maximumNewInstallment);
  $("#capacity-meter").style.width = `${Math.min(100, Math.max(0, result.ratioUse))}%`;
  $("#capacity-copy").textContent =
    result.maximumNewInstallment > 0
      ? "Batas memakai rasio dan sisa uang setelah komitmen."
      : "Belum ada ruang aman untuk cicilan tambahan.";
  $("#dashboard-status").textContent =
    result.status === "healthy" ? "Ruang terjaga" : result.status === "caution" ? "Perlu hati-hati" : "Tekanan tinggi";
  $("#metric-expenses").textContent = money(result.totalExpenses);
  $("#metric-expense-ratio").textContent = percent(result.expenseRatio);
  $("#metric-dti").textContent = percent(result.dti);
  $("#metric-savings").textContent = money(result.potentialSavings);

  const spending = Math.min(100, result.expenseRatio);
  const recurring = result.income ? Math.min(100 - spending, (result.recurring / result.income) * 100) : 0;
  $("#spending-donut").style.background =
    `conic-gradient(#d9b465 0 ${spending}%, #77b1ab ${spending}% ${spending + recurring}%, #dce9e7 ${spending + recurring}% 100%)`;
  const flows = [
    ["Kebutuhan", result.essentials, "#d2a14d"],
    ["Rutin", result.recurring, "#77b1ab"],
    ["Tabungan", result.savings, "#729b9c"],
    ["Sisa", Math.max(0, result.residualIncome), "#163d56"],
  ];
  $("#cashflow-bars").innerHTML = flows
    .map(
      ([name, amount]) =>
        `<div class="flow-row"><span>${name}</span><div class="flow-track"><i style="width:${Math.min(100, result.income ? (amount / result.income) * 100 : 0)}%;background:${amount === result.essentials ? "#d2a14d" : ""}"></i></div><strong>${money(amount)}</strong></div>`
    )
    .join("");
}

function updateAffordability() {
  const form = $("#affordability-form");
  app.affordability = calculateAffordability(getFinanceInput(form));
  const result = app.affordability;
  $("#max-installment").textContent = money(result.maximumNewInstallment);
  $("#income-cap").textContent = money(result.incomeCap);
  $("#disposable-income").textContent = money(result.disposableIncome);
  $("#current-dti").textContent = percent(result.dti);
  $("#recommended-installment").textContent = money(result.recommendedInstallment);
  const descriptions = {
    healthy: "Kebutuhan, tabungan, dan buffer masih terlindungi dalam simulasi ini.",
    caution: "Masih ada ruang, tetapi batas cicilan atau sisa uang sudah cukup ketat.",
    "over-budget": "Cicilan atau komitmen melebihi batas yang aman untuk kondisi saat ini.",
  };
  const statuses = {
    healthy: "Sehat",
    caution: "Perlu hati-hati",
    "over-budget": "Melebihi anggaran",
  };
  const banner = $("#affordability-status");
  banner.className = `status-banner ${result.status}`;
  banner.textContent = `${statuses[result.status]}. ${descriptions[result.status]}`;
  $("#affordability-summary").textContent =
    result.maximumNewInstallment > 0
      ? `Saran yang lebih nyaman adalah sekitar ${money(result.recommendedInstallment)} per periode.`
      : "Prioritaskan mengurangi komitmen atau menambah ruang arus kas sebelum mengambil cicilan baru.";
}

function updateEmergency() {
  app.emergency = calculateEmergencyFund(formData($("#emergency-form")));
  const result = app.emergency;
  $("#emergency-progress").textContent = percent(result.progress);
  $("#emergency-meter").style.width = `${result.progress}%`;
  $("#emergency-target").textContent = money(result.target);
  $("#emergency-remaining").textContent = money(result.remaining);
  $("#emergency-time").textContent =
    result.estimatedMonths === null
      ? "Belum dapat dihitung"
      : result.estimatedMonths === 0
        ? "Target tercapai"
        : `${Math.ceil(result.estimatedMonths)} bulan`;
  $("#emergency-copy").textContent =
    result.dependents > 0
      ? `Target ${result.targetMonths} bulan mempertimbangkan pengeluaran wajib. Tanggungan tetap perlu ditinjau secara pribadi.`
      : `Target setara ${result.targetMonths} bulan pengeluaran wajib Anda.`;
}

function getLoanInput() {
  const values = formData($("#loan-form"));
  const intervalDays =
    values.intervalDays === "custom" ? values.customInterval : values.intervalDays;
  return { ...values, intervalDays: numberValue(intervalDays, 30) };
}

function updateLoan() {
  app.loan = calculateLoan(getLoanInput());
  app.schedule = generateAmortization(getLoanInput());
  const result = app.loan;
  const recommendation = calculateRecommendation({
    affordability: app.affordability,
    emergency: app.emergency,
    proposedInstallment: result.periodicPayment,
    cashPrice: result.price,
    availableCash: app.emergency?.currentSavings,
  });
  $("#loan-installment").textContent = money(result.periodicPayment);
  $("#loan-principal").textContent = money(result.principal);
  $("#loan-interest").textContent = money(result.totalInterest);
  $("#loan-fees").textContent = money(result.totalFees);
  $("#loan-total").textContent = money(result.totalPayment);
  $("#loan-cost").textContent = `${money(result.creditCost)} (${percent(result.costPercentage)})`;
  const validation = $("#loan-validation");
  const recommendationClass = {
    safe: "",
    caution: "caution",
    "not-recommended": "over-budget",
    "cash-recommended": "neutral",
  };
  validation.className = `status-banner ${result.valid ? recommendationClass[recommendation.status] : "over-budget"}`;
  validation.textContent = result.valid
    ? `${recommendation.title}. ${recommendation.reason}`
    : result.message;
  $("#schedule-body").innerHTML = app.schedule.length
    ? app.schedule
        .map(
          (entry) => `<tr><td>${entry.number}</td><td>${formatDate(entry.dueDate)}</td><td>${money(entry.openingBalance)}</td><td>${money(entry.principalPayment)}</td><td>${money(entry.interest)}</td><td>${money(entry.payment)}</td><td>${money(entry.endingBalance)}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="7">Masukkan parameter pembiayaan yang valid untuk membuat jadwal.</td></tr>`;
}

function updateCreditCard() {
  const result = calculateCreditCard(formData($("#card-form")));
  const warning = result.paysInFull
    ? "Pembayaran penuh dipilih. Estimasi bunga periode berikutnya adalah Rp0."
    : result.belowMinimum
      ? "Pembayaran di bawah minimum input. Risiko denda atau konsekuensi lain mengikuti perjanjian bank."
      : "Pembayaran sebagian menyisakan saldo yang dapat dikenai bunga sesuai ketentuan bank.";
  $("#card-result").innerHTML =
    `<strong>Minimum: ${money(result.minimumPayment)}</strong><br />Sisa tagihan: ${money(result.remainder)}<br />Estimasi bunga: ${money(result.interest)}<br /><span>${warning}</span>`;
}

function updatePindar() {
  const result = calculatePindar(formData($("#pindar-form")));
  $("#pindar-result").innerHTML = result.valid
    ? `<strong>Estimasi pelunasan: ${money(result.totalRepayment)}</strong><br />Bunga: ${money(result.totalInterest)} | Biaya lain: ${money(result.otherFees)}`
    : "Masukkan dana diterima, biaya per hari, dan lama pinjaman yang valid.";
}

function updatePayLater() {
  const values = formData($("#paylater-form"));
  const plans = calculatePayLaterPlans({
    amount: values.amount,
    serviceFee: values.serviceFee,
    rates: { 1: 0, 3: values.rate3, 6: values.rate6, 12: values.rate12 },
  });
  $("#paylater-result").innerHTML = plans
    .map(
      (plan) =>
        `<div><span>${plan.label}</span><strong>${money(plan.periodicPayment)}/bln</strong></div>`
    )
    .join("");
}

function formatDate(date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function renderOffers() {
  const grid = $("#offer-grid");
  const capacity = app.affordability?.maximumNewInstallment || 0;
  grid.innerHTML = app.offers
    .map(
      (offer, index) => `
        <form class="card offer-card" data-offer-index="${index}">
          <div class="card-heading"><div><p class="eyebrow">Opsi ${index + 1}</p><h2>${offer.name || "Penawaran baru"}</h2></div>${app.offers.length > 1 ? `<button class="text-button remove-offer" type="button" data-remove-offer="${index}">Hapus</button>` : ""}</div>
          <div class="field-grid compact-fields">
            <label>Nama opsi<input name="name" type="text" value="${escapeHtml(offer.name || "")}" /></label>
            <label>Uang muka<input name="downPayment" type="text" inputmode="numeric" data-money value="${formatMoneyInput(offer.downPayment)}" /></label>
            <label>Pokok<input name="principal" type="text" inputmode="numeric" data-money value="${formatMoneyInput(offer.principal)}" /></label>
            <label>Tenor<input name="tenor" type="number" min="1" value="${numberValue(offer.tenor, 1)}" /></label>
            <label>Bunga (%)<input name="rate" type="number" min="0" step="0.01" value="${numberValue(offer.rate)}" /></label>
            <label>Metode<select name="method"><option value="flat" ${offer.method === "flat" ? "selected" : ""}>Flat</option><option value="annuity" ${offer.method === "annuity" ? "selected" : ""}>Anuitas</option></select></label>
            <label>Admin<input name="adminFee" type="text" inputmode="numeric" data-money value="${formatMoneyInput(offer.adminFee)}" /></label>
            <label>Layanan<input name="serviceFee" type="text" inputmode="numeric" data-money value="${formatMoneyInput(offer.serviceFee)}" /></label>
          </div>
          <input type="hidden" name="capacity" value="${capacity}" />
        </form>`
    )
    .join("");
  renderComparison();
}

function renderComparison() {
  const cashPrice = numberValue(rawMoney($("#cash-price").value));
  const item = $("#comparison-item").value.trim() || "barang";
  const rows = compareOffers(
    app.offers.map((offer) => ({ ...offer, price: cashPrice, capacity: app.affordability?.maximumNewInstallment || 0 })),
    $("#comparison-sort").value
  );
  const table = $("#comparison-table");
  if (!rows.length) {
    table.innerHTML = "<tbody><tr><td>Tambahkan opsi pembiayaan untuk membandingkan.</td></tr></tbody>";
    return;
  }
  table.querySelector("thead").innerHTML = `<tr><th>Parameter</th>${rows
    .map(
      (offer) =>
        `<th>${escapeHtml(offer.name)}${offer.isCheapest ? '<span class="mark">Termurah</span>' : ""}${offer.isMostSuitable ? '<span class="mark suitable">Sesuai kemampuan</span>' : ""}</th>`
    )
    .join("")}</tr>`;
  const data = [
    ["Uang muka", (offer) => money(offer.downPayment)],
    ["Cicilan per periode", (offer) => money(offer.periodicPayment)],
    ["Total bunga", (offer) => money(offer.totalInterest)],
    ["Biaya tambahan", (offer) => money(offer.totalFees)],
    ["Total pembayaran", (offer) => money(offer.totalPayment)],
    ["Total biaya kredit", (offer) => money(offer.creditCost)],
    ["Selisih dari termurah", (offer) => money(offer.costDifference)],
    ["Tenor", (offer) => `${offer.tenor} periode`],
  ];
  table.querySelector("tbody").innerHTML = data
    .map(
      ([label, read]) =>
        `<tr><td>${label}</td>${rows.map((offer) => `<td>${read(offer)}</td>`).join("")}</tr>`
    )
    .join("");
  const cheapest = rows.find((offer) => offer.isCheapest);
  const suitable = rows.find((offer) => offer.isMostSuitable);
  $("#comparison-heading").textContent = `Perbandingan ${item}`;
  $("#comparison-insight").textContent = cheapest
    ? `${cheapest.name} memiliki total pembayaran paling rendah dalam data ini.${suitable ? ` ${suitable.name} adalah opsi pertama yang masih berada dalam kemampuan cicilan Anda.` : " Tidak ada opsi yang berada dalam kemampuan cicilan saat ini."} Pertimbangkan juga uang muka dan tenor sebelum memilih.`
    : "";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]);
}

const lessons = [
  ["Apa itu kredit?", "Kredit adalah fasilitas untuk memakai dana atau barang sekarang dan membayar sesuai kesepakatan.", "Pinjaman Rp3 juta dibayar enam kali.", "Bisa membantu kebutuhan terencana.", "Biaya dan kewajiban tetap berjalan.", "Hitung total pembayaran sebelum setuju."],
  ["Apa itu limit kredit?", "Limit adalah batas penggunaan yang diberikan penyedia, bukan tambahan penghasilan.", "Limit Rp5 juta tidak berarti semua perlu dipakai.", "Memudahkan transaksi terukur.", "Limit penuh dapat membebani arus kas.", "Sisakan ruang untuk keadaan tidak terduga."],
  ["Apa itu bunga?", "Bunga adalah biaya penggunaan dana selama periode tertentu.", "Bunga flat 2% per bulan pada Rp3 juta selama 6 bulan menghasilkan Rp360 ribu.", "Membantu membaca biaya pinjaman.", "Persentase kecil dapat membesar bila tenor panjang.", "Bandingkan nominal total bunga."],
  ["Apa itu tenor?", "Tenor adalah jumlah atau jarak periode pembayaran.", "Tenor 12 bulan membagi kewajiban ke 12 periode.", "Cicilan per periode dapat lebih kecil.", "Total biaya dapat lebih besar.", "Pilih tenor yang juga minim biaya."],
  ["Apa itu cicilan?", "Cicilan adalah pembayaran berkala atas pokok, bunga, dan biaya sesuai kontrak.", "Rp3 juta tanpa bunga dalam 6 bulan setara Rp500 ribu per bulan.", "Membuat pembayaran tersebar.", "Komitmen mengurangi ruang bulanan.", "Masukkan ke anggaran sebelum membeli."],
  ["Apa itu biaya administrasi?", "Biaya administrasi adalah biaya proses yang ditetapkan penyedia.", "Biaya Rp100 ribu menambah total kredit walau bunganya nol.", "Membantu proses layanan.", "Dapat membuat kredit lebih mahal.", "Selalu cek biaya di luar bunga."],
  ["Apa itu denda keterlambatan?", "Denda adalah konsekuensi pembayaran melewati ketentuan penyedia.", "Nominal dan cara hitung berbeda tiap kontrak.", "Mendorong disiplin jadwal.", "Menambah tagihan saat arus kas sempit.", "Atur pengingat sebelum jatuh tempo."],
  ["Apa itu kartu kredit?", "Kartu kredit adalah fasilitas pembayaran dengan tagihan yang harus dibayar sesuai perjanjian.", "Bayar penuh biasanya menghindari saldo bergulir, sesuai ketentuan bank.", "Berguna untuk transaksi terencana.", "Bayar minimum dapat menyisakan bunga.", "Pahami tanggal cetak dan jatuh tempo."],
  ["Apa itu PayLater?", "PayLater menunda pembayaran atau membaginya ke beberapa periode.", "Barang Rp1,5 juta dapat dipilih bayar bulan depan atau dicicil.", "Praktis untuk transaksi tertentu.", "Biaya layanan dan bunga dapat berlaku.", "Bandingkan total harga dengan tunai."],
  ["Apa itu Pindar?", "Pindar adalah layanan pendanaan bersama berbasis teknologi dengan ketentuan berbeda tiap penyedia.", "Biaya harian dikalikan lama pinjaman memengaruhi pelunasan.", "Akses dapat lebih cepat.", "Biaya dapat bertambah cepat jika terlambat.", "Gunakan penyedia yang terdaftar dan pahami kontraknya."],
  ["Apa itu KTA?", "KTA adalah kredit tanpa agunan yang syarat dan biayanya mengikuti bank atau penyedia.", "Dana Rp10 juta dibayar dalam tenor tertentu.", "Tidak memerlukan aset sebagai jaminan.", "Tetap menjadi kewajiban cicilan.", "Bandingkan bunga efektif dan biaya."],
  ["Apa itu SLIK OJK?", "SLIK adalah sistem informasi yang digunakan dalam proses tertentu oleh lembaga keuangan.", "Riwayat pembayaran dapat menjadi salah satu bahan pertimbangan.", "Mendorong disiplin pembayaran.", "Informasi salah perlu ditindaklanjuti melalui jalur resmi.", "Gunakan kanal resmi OJK untuk informasi."],
  ["Cara membaca tagihan kartu kredit", "Perhatikan total tagihan, minimum pembayaran, tanggal cetak, dan jatuh tempo.", "Bayar penuh berbeda dari minimum pembayaran.", "Membantu menghindari kejutan tagihan.", "Salah membaca dapat meninggalkan saldo berbunga.", "Prioritaskan pembayaran penuh bila mampu."],
  ["Cara membandingkan penawaran cicilan", "Bandingkan uang muka, bunga, seluruh biaya, tenor, dan total pembayaran.", "Cicilan Rp300 ribu bisa lebih mahal daripada Rp400 ribu jika tenornya jauh lebih panjang.", "Membuka pilihan yang lebih jelas.", "Fokus pada satu angka bisa menyesatkan.", "Gunakan tabel perbandingan."],
  ["Bahaya gali lubang tutup lubang", "Mengambil utang baru untuk membayar utang lama dapat memperbesar biaya dan risiko.", "Cicilan baru dipakai menutup tagihan jatuh tempo.", "Tidak ada manfaat jangka panjang yang pasti.", "Komitmen menumpuk dan arus kas tertekan.", "Cari bantuan, susun ulang anggaran, dan hubungi penyedia bila perlu."],
  ["Cara membangun riwayat kredit sehat", "Bayar sesuai jadwal, gunakan seperlunya, dan pahami kontrak sebelum mengambil fasilitas.", "Buat pengingat beberapa hari sebelum jatuh tempo.", "Membangun kebiasaan finansial tertib.", "Penggunaan berlebihan mengganggu anggaran.", "Mulai dari kewajiban yang benar-benar mampu dibayar."],
];

function renderEducation() {
  $("#education-grid").innerHTML = lessons
    .map(
      ([title, definition, example, benefit, risk, tip], index) => `
        <details class="education-item" ${index === 0 ? "open" : ""}>
          <summary>${title}</summary>
          <div class="lesson-body">
            <p><strong>Definisi:</strong> ${definition}</p>
            <p><strong>Cara kerja:</strong> Nilai, biaya, jadwal, dan syarat mengikuti perjanjian penyedia yang Anda pilih.</p>
            <p><strong>Contoh:</strong> ${example}</p>
            <p><strong>Kelebihan:</strong> ${benefit}</p>
            <p><strong>Risiko:</strong> ${risk}</p>
            <p><strong>Tips:</strong> ${tip}</p>
          </div>
        </details>`
    )
    .join("");
}

function renderHistory() {
  const entries = load("history", []);
  $("#history-list").innerHTML = entries.length
    ? entries
        .map(
          (entry) => `
          <article class="history-entry">
            <div><p><strong>${escapeHtml(entry.name || "Simulasi kredit")}</strong></p><small>${formatDate(entry.createdAt.slice(0, 10))} | ${money(entry.periodicPayment)} per periode | Total ${money(entry.totalPayment)}</small></div>
            <button class="text-button remove-offer" type="button" data-delete-history="${entry.id}">Hapus</button>
          </article>`
        )
        .join("")
    : `<div class="history-empty">Belum ada simulasi tersimpan. Simpan hasil dari modul Simulasi kredit.</div>`;
}

function saveCurrentSimulation() {
  if (!app.loan?.valid) {
    showToast("Periksa parameter simulasi sebelum menyimpan.");
    return;
  }
  const loanValues = getLoanInput();
  saveSimulation({
    name: `${loanValues.product} - ${loanValues.tenor} periode`,
    periodicPayment: app.loan.periodicPayment,
    totalPayment: app.loan.totalPayment,
    loan: loanValues,
  });
  renderHistory();
  showToast("Simulasi disimpan di perangkat ini.");
}

function downloadCsv() {
  if (!app.schedule.length) {
    showToast("Buat jadwal pembayaran yang valid terlebih dahulu.");
    return;
  }
  const columns = ["No", "Jatuh tempo", "Saldo awal", "Pokok", "Bunga", "Pembayaran", "Saldo akhir"];
  const rows = app.schedule.map((entry) => [
    entry.number,
    entry.dueDate,
    Math.round(entry.openingBalance),
    Math.round(entry.principalPayment),
    Math.round(entry.interest),
    Math.round(entry.payment),
    Math.round(entry.endingBalance),
  ]);
  downloadFile([columns, ...rows].map((row) => row.join(",")).join("\n"), "finwise-jadwal.csv", "text/csv");
}

function downloadReport() {
  if (!app.loan?.valid) {
    showToast("Periksa parameter simulasi sebelum mengunduh.");
    return;
  }
  const lines = [
    "FINWISE - RINGKASAN SIMULASI",
    `Tanggal: ${new Date().toLocaleDateString("id-ID")}`,
    "",
    `Pokok pembiayaan: ${money(app.loan.principal)}`,
    `Cicilan per periode: ${money(app.loan.periodicPayment)}`,
    `Total bunga: ${money(app.loan.totalInterest)}`,
    `Total biaya tambahan: ${money(app.loan.totalFees)}`,
    `Total pembayaran: ${money(app.loan.totalPayment)}`,
    "",
    "Seluruh hasil merupakan simulasi edukatif, bukan penawaran pembiayaan atau keputusan kredit.",
  ];
  downloadFile(lines.join("\n"), "finwise-ringkasan.txt", "text/plain");
}

function downloadFile(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function persistState() {
  save("forms", {
    dashboard: formData($("#dashboard-form")),
    affordability: formData($("#affordability-form")),
    emergency: formData($("#emergency-form")),
    loan: formData($("#loan-form")),
    card: formData($("#card-form")),
    pindar: formData($("#pindar-form")),
    paylater: formData($("#paylater-form")),
  });
  save("offers", app.offers);
}

function updateAll() {
  toggleCustomFields();
  updateDashboard();
  updateAffordability();
  updateEmergency();
  updateLoan();
  updateCreditCard();
  updatePindar();
  updatePayLater();
  renderComparison();
  persistState();
}

function setupNavigation() {
  $$(".nav-link").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.nav;
      $$(".view").forEach((view) => view.classList.toggle("active", view.dataset.view === target));
      $$(".nav-link").forEach((link) => link.classList.toggle("active", link === button));
      $("#section-index").textContent = button.querySelector("span").textContent;
      $("#section-title").textContent = button.textContent.trim().replace(/^\d+/, "");
      $("#sidebar").classList.remove("open");
      $("#menu-button").setAttribute("aria-expanded", "false");
      if (target === "history") renderHistory();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
  $("#menu-button").addEventListener("click", () => {
    const sidebar = $("#sidebar");
    const open = sidebar.classList.toggle("open");
    $("#menu-button").setAttribute("aria-expanded", String(open));
  });
}

function setupMoneyInputs() {
  document.addEventListener(
    "input",
    (event) => {
      const field = event.target.closest("[data-money]");
      if (!field) return;
      field.value = formatMoneyInput(field.value);
    },
    true
  );
  $$("[data-money]").forEach((field) => {
    field.value = formatMoneyInput(field.value);
  });
}

function setupForms() {
  const stored = load("forms", {});
  Object.entries({
    dashboard: $("#dashboard-form"),
    affordability: $("#affordability-form"),
    emergency: $("#emergency-form"),
    loan: $("#loan-form"),
    card: $("#card-form"),
    pindar: $("#pindar-form"),
    paylater: $("#paylater-form"),
  }).forEach(([key, form]) => populateForm(form, stored[key]));

  ["transactionDate", "statementDate", "dueDate", "startDate"].forEach((name) => {
    const input = document.querySelector(`[name="${name}"]`);
    if (input && !input.value) input.value = new Date().toISOString().slice(0, 10);
  });
  $("#dashboard-form").addEventListener("input", () => {
    syncFinanceForms($("#dashboard-form"));
    updateAll();
  });
  $("#affordability-form").addEventListener("input", () => {
    syncFinanceForms($("#affordability-form"));
    updateAll();
  });
  ["#emergency-form", "#loan-form", "#card-form", "#pindar-form", "#paylater-form"].forEach(
    (selector) => $(selector).addEventListener("input", updateAll)
  );
  ["#dashboard-form", "#affordability-form", "#emergency-form", "#loan-form"].forEach((selector) =>
    $(selector).addEventListener("reset", () => window.setTimeout(updateAll))
  );
  $("#loan-form").addEventListener("change", updateAll);
  $("#affordability-form").addEventListener("change", updateAll);
  $("#use-max-installment").addEventListener("click", () => {
    $("#loan-form").elements.principal.value = Math.round(app.affordability.maximumNewInstallment);
    $("#loan-form").elements.downPayment.value = 0;
    $("#loan-form").elements.price.value = Math.round(app.affordability.maximumNewInstallment);
    updateAll();
    showToast("Nilai kemampuan cicilan dimasukkan sebagai pokok simulasi satu periode.");
  });
}

function setupActions() {
  $("#save-simulation").addEventListener("click", saveCurrentSimulation);
  $("#download-csv").addEventListener("click", downloadCsv);
  $("#download-report").addEventListener("click", downloadReport);
  $("#print-report").addEventListener("click", () => window.print());
  $("#add-offer").addEventListener("click", () => {
    if (app.offers.length >= 5) {
      showToast("Perbandingan dibatasi hingga lima opsi.");
      return;
    }
    app.offers.push({ name: `Opsi ${app.offers.length + 1}`, downPayment: 0, principal: 0, tenor: 6, rate: 0, method: "flat", adminFee: 0, serviceFee: 0 });
    renderOffers();
    persistState();
  });
  $("#offer-grid").addEventListener("input", (event) => {
    const form = event.target.closest("[data-offer-index]");
    if (!form) return;
    app.offers[Number(form.dataset.offerIndex)] = formData(form);
    renderComparison();
    persistState();
  });
  $("#offer-grid").addEventListener("click", (event) => {
    const index = event.target.dataset.removeOffer;
    if (index === undefined) return;
    app.offers.splice(Number(index), 1);
    renderOffers();
    persistState();
  });
  ["#comparison-item", "#cash-price", "#comparison-sort"].forEach((selector) =>
    $(selector).addEventListener("input", renderComparison)
  );
  $("#history-list").addEventListener("click", (event) => {
    const id = event.target.dataset.deleteHistory;
    if (!id) return;
    if (window.confirm("Hapus simulasi ini dari perangkat Anda? Tindakan ini tidak dapat dibatalkan.")) {
      deleteSimulation(id);
      renderHistory();
      showToast("Riwayat simulasi dihapus.");
    }
  });
}

function initialize() {
  setupNavigation();
  setupMoneyInputs();
  setupForms();
  setupActions();
  renderEducation();
  renderOffers();
  renderHistory();
  updateAll();
}

initialize();
