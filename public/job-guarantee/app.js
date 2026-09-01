const jobCategories = [
  {
    id: "education",
    label: "Education + youth",
    color: "#63d8ff",
    description: "Add human attention around—not in place of—licensed teachers and permanent school employees.",
    examples: ["Reading tutor", "After-school mentor", "Family outreach", "Library aide", "Robotics coach"],
  },
  {
    id: "care",
    label: "Care + connection",
    color: "#78e3b5",
    description: "Support older adults, disabled residents, caregivers and families while keeping clinical work with qualified professionals.",
    examples: ["Senior companion", "Meal delivery", "Respite support", "Benefit navigator", "Childcare assistant"],
  },
  {
    id: "environment",
    label: "Land + climate",
    color: "#a8d27d",
    description: "Restore common resources and build local capacity for heat, fire, flood and pollution risks.",
    examples: ["Tree crew", "Water monitor", "Trail steward", "Heat mapper", "Remediation aide"],
  },
  {
    id: "neighborhoods",
    label: "Homes + places",
    color: "#f5b96f",
    description: "Maintain public space and assist vulnerable residents with small-scale repairs and accessibility work.",
    examples: ["Accessibility survey", "Repair aide", "Vacant-lot crew", "Bus-stop steward", "Material recovery"],
  },
  {
    id: "health",
    label: "Public health + food",
    color: "#f48e9c",
    description: "Extend outreach, navigation, nutrition and prevention without substituting for clinicians or social workers.",
    examples: ["Health navigator", "Food recovery", "Wellness check", "Garden worker", "Resource coordinator"],
  },
  {
    id: "digital",
    label: "Digital + cultural",
    color: "#bca6ff",
    description: "Make public information accessible, preserve local knowledge and help residents use digital institutions.",
    examples: ["Archive digitizer", "Web accessibility", "Digital tutor", "Oral historian", "Open-data aide"],
  },
  {
    id: "capacity",
    label: "Community capacity",
    color: "#78d9d1",
    description: "The VISTA lineage: help community organizations organize people, evidence and resources around local priorities.",
    examples: ["Volunteer coordinator", "Needs survey", "Meeting facilitator", "Project recorder", "Mutual-aid organizer"],
  },
  {
    id: "resilience",
    label: "Emergency readiness",
    color: "#ff9f73",
    description: "Maintain useful readiness in normal periods and provide rapidly deployable capacity during emergencies.",
    examples: ["Supply inventory", "Shelter aide", "Risk mapper", "Preparedness outreach", "Damage survey"],
  },
];

const allocation = [
  { label: "Education + care", share: 34, color: "#63d8ff" },
  { label: "Land + resilience", share: 25, color: "#78e3b5" },
  { label: "Homes + food", share: 18, color: "#f5b96f" },
  { label: "Health outreach", share: 11, color: "#f48e9c" },
  { label: "Digital + culture", share: 12, color: "#bca6ff" },
];

const filterRoot = document.querySelector("#jobFilters");
const jobGrid = document.querySelector("#jobGrid");
let selectedFilter = "all";

function renderFilters() {
  const filters = [{ id: "all", label: "All work" }, ...jobCategories.map(({ id, label }) => ({ id, label }))];
  filterRoot.innerHTML = filters.map((filter) => `<button type="button" data-filter="${filter.id}" class="${filter.id === selectedFilter ? "active" : ""}">${filter.label}</button>`).join("");
}

function renderJobs() {
  const visible = selectedFilter === "all" ? jobCategories : jobCategories.filter(({ id }) => id === selectedFilter);
  jobGrid.innerHTML = visible.map((job, index) => `
    <article class="job-card" style="--card-color:${job.color}">
      <div class="job-meta"><span>${job.label}</span><span class="job-count">${String(index + 1).padStart(2, "0")}</span></div>
      <h3>${job.label}</h3>
      <p>${job.description}</p>
      <ul>${job.examples.map((example) => `<li>${example}</li>`).join("")}</ul>
    </article>
  `).join("");
}

filterRoot?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;
  selectedFilter = button.dataset.filter;
  renderFilters();
  renderJobs();
});

const participantsInput = document.querySelector("#participants");
const wageInput = document.querySelector("#wage");
const hoursInput = document.querySelector("#hours");
const compactCurrency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const wholeCurrency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const compactNumber = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function updateSliderFill(input) {
  const min = Number(input.min);
  const max = Number(input.max);
  const fill = ((Number(input.value) - min) / (max - min)) * 100;
  input.style.setProperty("--fill", `${fill}%`);
}

function renderScenario() {
  const participantsMillions = Number(participantsInput.value);
  const participants = participantsMillions * 1_000_000;
  const wage = Number(wageInput.value);
  const hours = Number(hoursInput.value);
  const annualIncome = wage * hours * 52;
  const payroll = participants * annualIncome;
  const laborHours = participants * hours * 52;

  document.querySelector("#participantsOutput").textContent = `${participantsMillions.toFixed(participantsMillions % 1 ? 1 : 0)}M`;
  document.querySelector("#wageOutput").textContent = `${wholeCurrency.format(wage)} / hr`;
  document.querySelector("#hoursOutput").textContent = `${hours} hrs`;
  document.querySelector("#payrollMetric").textContent = compactCurrency.format(payroll);
  document.querySelector("#incomeMetric").textContent = wholeCurrency.format(annualIncome);
  document.querySelector("#laborMetric").textContent = compactNumber.format(laborHours);

  document.querySelector("#allocationBars").innerHTML = allocation.map((item) => {
    const workers = participants * item.share / 100;
    return `<div class="allocation-row">
      <span>${item.label}</span>
      <div class="allocation-track"><div class="allocation-fill" style="--bar-color:${item.color};width:${item.share}%"></div></div>
      <strong>${compactNumber.format(workers)}</strong>
    </div>`;
  }).join("");

  [participantsInput, wageInput, hoursInput].forEach(updateSliderFill);
}

[participantsInput, wageInput, hoursInput].forEach((input) => input?.addEventListener("input", renderScenario));

renderFilters();
renderJobs();
renderScenario();
