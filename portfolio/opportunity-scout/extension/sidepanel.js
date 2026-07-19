const button = document.querySelector("#analyze");
const result = document.querySelector("#result");
button.addEventListener("click", () => {
  const sample = document.querySelector("#sample").value;
  result.textContent = sample + ": opportunity 82/100. Evidence: PDF-only catalog, generic contact form. Review required.";
});
