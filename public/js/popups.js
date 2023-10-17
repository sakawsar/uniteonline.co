const togglePopup = (popupId) => {
  const popupOverlay = document.getElementById("popupOverlay");
  popupOverlay.classList.toggle("active-popup-overlay");
  document.getElementById(`${popupId}`).classList.toggle("active-popup");
}
