// ==========================================================
// Haircraft Barber — Site Scripti
// Navbar, reveal animasyonları, görsel fallback, galeri lightbox
// ve randevu (Vercel API & Telegram) sistemi
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {

  // ========================================================
  // NAVBAR: scroll durumu + mobil menü
  // ========================================================

  const header = document.getElementById("siteHeader");
  const nav = document.getElementById("mainNav");
  const navToggle = document.getElementById("navToggle");

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const progressBar = document.getElementById("scrollProgress");
  const backToTop = document.getElementById("backToTop");
  const heroFrame = document.querySelector(".media-frame-hero");

  let heroScrollOffset = 0;
  let heroMouseX = 0;
  let heroMouseY = 0;

  function applyHeroTransform() {
    if (!heroFrame) return;
    heroFrame.style.transform =
      `translate3d(${heroMouseX}px, ${heroScrollOffset + heroMouseY}px, 0)`;
  }

  function updateOnScroll() {
    const y = window.scrollY;

    // Navbar durumu
    if (header) header.classList.toggle("is-scrolled", y > 8);

    // Okuma ilerleme çubuğu
    if (progressBar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(y / max, 1) : 0;
      progressBar.style.transform = `scaleX(${ratio})`;
    }

    // Yukarı çık butonu
    if (backToTop) backToTop.classList.toggle("is-visible", y > 520);

    // Hero görseli için hafif kaydırma parallax'ı
    if (!prefersReducedMotion && heroFrame && y < 900) {
      heroScrollOffset = Math.min(y * 0.05, 28);
      applyHeroTransform();
    }
  }

  let scrollTicking = false;
  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      updateOnScroll();
      scrollTicking = false;
    });
  }
  updateOnScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  backToTop?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  });

  // ========================================================
  // MASAÜSTÜ: hero görseli fare tepkisi + magnetik butonlar
  // ========================================================

  if (canHover && !prefersReducedMotion) {

    const hero = document.querySelector(".hero");
    let mouseTicking = false;

    hero?.addEventListener("mousemove", (event) => {
      if (mouseTicking) return;
      mouseTicking = true;
      requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        const nx = (event.clientX - rect.left) / rect.width - 0.5;
        const ny = (event.clientY - rect.top) / rect.height - 0.5;
        heroMouseX = nx * 12;
        heroMouseY = ny * 8;
        applyHeroTransform();
        mouseTicking = false;
      });
    }, { passive: true });

    hero?.addEventListener("mouseleave", () => {
      heroMouseX = 0;
      heroMouseY = 0;
      applyHeroTransform();
    });

    document.querySelectorAll(".btn").forEach((btn) => {
      let rect = null;

      btn.addEventListener("mouseenter", () => {
        rect = btn.getBoundingClientRect();
      });

      btn.addEventListener("mousemove", (event) => {
        if (!rect) return;
        const x = (event.clientX - rect.left - rect.width / 2) * 0.16;
        const y = (event.clientY - rect.top - rect.height / 2) * 0.22;
        btn.style.transform = `translate(${x.toFixed(1)}px, ${(y - 1).toFixed(1)}px)`;
      });

      btn.addEventListener("mousedown", () => {
        btn.style.transform = "scale(0.96)";
      });

      btn.addEventListener("mouseleave", () => {
        rect = null;
        btn.style.transform = "";
      });
    });
  }

  function closeNav() {
    if (!nav || !navToggle) return;
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  }

  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      document.body.classList.toggle("nav-open", isOpen);
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeNav);
    });
  }

  // ========================================================
  // GÖRSEL FALLBACK
  // ========================================================

  function markImageBroken(img) {
    const frame = img.closest("[data-fallback-frame]");
    if (frame) {
      frame.classList.add("is-empty");
    } else {
      img.style.display = "none";
    }
  }

  document.querySelectorAll("img[data-fallback]").forEach((img) => {
    img.addEventListener("error", () => markImageBroken(img));

    if (img.complete) {
      if (img.naturalWidth > 0) {
        img.classList.add("is-loaded");
      } else {
        markImageBroken(img);
      }
    } else {
      img.classList.add("is-loading");
      img.addEventListener("load", () => {
        img.classList.remove("is-loading");
        img.classList.add("is-loaded");
      }, { once: true });
    }
  });

  // ========================================================
  // REVEAL
  // ========================================================

  const revealItems = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window && revealItems.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  // ========================================================
  // GALERİ / LIGHTBOX
  // ========================================================

  const galleryItems = Array.from(document.querySelectorAll(".gallery-item"));
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  let currentGalleryIndex = 0;

  function getGalleryImageSrc(index) {
    const img = galleryItems[index]?.querySelector("img");
    return img ? { src: img.getAttribute("src"), alt: img.getAttribute("alt") || "" } : null;
  }

  let swapTimer = null;

  function setLightboxImage(data, animate) {
    if (!lightboxImage || !data) return;
    clearTimeout(swapTimer);

    if (!animate || prefersReducedMotion) {
      lightboxImage.src = data.src;
      lightboxImage.alt = data.alt;
      return;
    }

    lightboxImage.classList.add("is-swapping");
    swapTimer = setTimeout(() => {
      lightboxImage.src = data.src;
      lightboxImage.alt = data.alt;
      lightboxImage.classList.remove("is-swapping");
    }, 160);
  }

  function openLightbox(index) {
    if (!lightbox || !lightboxImage || !galleryItems.length) return;
    const data = getGalleryImageSrc(index);
    if (!data) return;

    currentGalleryIndex = index;
    setLightboxImage(data, false);
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function showAdjacentImage(direction) {
    if (!galleryItems.length) return;
    currentGalleryIndex = (currentGalleryIndex + direction + galleryItems.length) % galleryItems.length;
    setLightboxImage(getGalleryImageSrc(currentGalleryIndex), true);
  }

  galleryItems.forEach((item, index) => {
    item.addEventListener("click", () => {
      if (item.querySelector(".is-empty")) return;
      openLightbox(index);
    });
  });

  let touchStartX = null;
  lightbox?.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });
  lightbox?.addEventListener("touchend", (event) => {
    if (touchStartX === null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(deltaX) > 50) showAdjacentImage(deltaX < 0 ? 1 : -1);
  }, { passive: true });

  document.querySelectorAll("[data-close-lightbox]").forEach((btn) => {
    btn.addEventListener("click", closeLightbox);
  });

  document.querySelector("[data-lightbox-prev]")?.addEventListener("click", () => showAdjacentImage(-1));
  document.querySelector("[data-lightbox-next]")?.addEventListener("click", () => showAdjacentImage(1));

  lightbox?.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (event) => {
    if (!lightbox?.classList.contains("is-open")) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") showAdjacentImage(-1);
    if (event.key === "ArrowRight") showAdjacentImage(1);
  });

  // ========================================================
  // RANDEVU MODALI
  // ========================================================

  const modal = document.getElementById("appointmentModal");
  const form = document.getElementById("appointmentForm");
  const successBox = document.getElementById("appointmentSuccess");
  const summary = document.getElementById("appointmentSummary");

  const dateInput = document.getElementById("appointmentDate");
  const timeSelect = document.getElementById("appointmentTime");
  const serviceSelect = document.getElementById("service");
  const barberSelect = document.getElementById("barber");

  // Hem data niteliği olan hem de #randevu adresine giden butonları yakala
  const openButtons = document.querySelectorAll("[data-open-appointment], a[href='#randevu']");
  const closeButtons = document.querySelectorAll("[data-close-appointment]");

  let lastFocusedElement = null;

  // ========================================================
  // SAAT SEÇENEKLERİ (09:00–21:00)
  // ========================================================

  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
    "18:00", "18:30", "19:00", "19:30", "20:00", "20:30"
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (dateInput) {
    dateInput.min = formatDate(today);
  }

  function getTurkishDate(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    return new Intl.DateTimeFormat("tr-TR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function isSunday(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    return date.getDay() === 0;
  }

  function resetTimeSelect(message = "Önce tarih seçin") {
    if (!timeSelect) return;
    timeSelect.innerHTML = "";
    const option = document.createElement("option");
    option.value = "";
    option.textContent = message;
    timeSelect.appendChild(option);
    timeSelect.disabled = true;
  }

  function populateTimes(dateString) {
    if (!timeSelect) return;

    if (!dateString) {
      resetTimeSelect("Önce tarih seçin");
      return;
    }

    if (isSunday(dateString)) {
      resetTimeSelect("Pazar günü kapalıyız");
      return;
    }

    timeSelect.disabled = false;
    timeSelect.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Saat seçin";
    timeSelect.appendChild(defaultOption);

    timeSlots.forEach((time) => {
      const option = document.createElement("option");
      option.value = time;
      option.textContent = time;
      timeSelect.appendChild(option);
    });
  }

  // ========================================================
  // MODAL AÇMA / KAPAMA
  // ========================================================

  function getFocusableElements() {
    if (!modal) return [];
    return Array.from(
      modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null);
  }

  function openModal(trigger) {
    if (!modal) return;

    lastFocusedElement = document.activeElement;

    const presetService = trigger?.getAttribute?.("data-service");
    const presetBarber = trigger?.getAttribute?.("data-barber");

    if (presetService && serviceSelect) {
      serviceSelect.value = presetService;
    }
    if (presetBarber && barberSelect) {
      barberSelect.value = presetBarber;
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");

    const focusable = getFocusableElements();
    (focusable[0] || modal).focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    document.body.classList.remove("modal-open");

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  openButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      openModal(button);
    });
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  modal?.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (!modal?.classList.contains("is-open")) return;

    if (event.key === "Escape") {
      closeModal();
      return;
    }

    if (event.key === "Tab") {
      const focusable = getFocusableElements();
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  dateInput?.addEventListener("change", () => {
    populateTimes(dateInput.value);
  });

  // ========================================================
  // FORM GÖNDERİMİ (Vercel API + Telegram Entegrasyonu)
  // ========================================================

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  const errorBox = document.getElementById("formError");
  function showError(msg) { if (errorBox) errorBox.textContent = msg; }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    showError("");

    const formData = new FormData(form);
    const service = formData.get("service");
    const barber = formData.get("barber") || "Fark etmez";
    const date = formData.get("appointmentDate");
    const time = formData.get("appointmentTime");
    const name = formData.get("customerName");
    const phone = formData.get("customerPhone");

    if (!service || !date || !time || !name || !phone) {
      showError("Lütfen zorunlu alanları doldurun.");
      return;
    }

    const cleanPhone = String(phone).replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      showError("Lütfen geçerli bir telefon numarası girin.");
      return;
    }

    if (isSunday(date)) {
      showError("Pazar günü salonumuz kapalıdır. Lütfen başka bir gün seçin.");
      populateTimes(date);
      return;
    }

    if (dateInput && date < dateInput.min) {
      showError("Geçmiş bir tarih seçemezsiniz.");
      return;
    }

    // API'nin beklediği parametre isimlerine dönüştür (api/appointments.js ile tam uyumlu)
    const payload = {
      name: name,
      phone: phone,
      service: service,
      barber: barber,
      date: date,
      time: time
    };

    const submitBtn = form.querySelector(".appointment-submit") || form.querySelector("button[type='submit']");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add("is-loading");
    }

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) { 
        showError(data.message || data.error || "Randevu oluşturulamadı. Lütfen tekrar deneyin."); 
        return; 
      }
    } catch (err) {
      showError("Bağlantı hatası. Lütfen tekrar deneyin veya bizi arayın.");
      return;
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove("is-loading");
      }
    }

    if (summary) {
      summary.innerHTML = `
        <div><strong>Hizmet:</strong> ${escapeHtml(service)}</div>
        <div><strong>Berber:</strong> ${escapeHtml(barber)}</div>
        <div><strong>Tarih:</strong> ${escapeHtml(getTurkishDate(date))}</div>
        <div><strong>Saat:</strong> ${escapeHtml(time)}</div>
        <div><strong>Ad Soyad:</strong> ${escapeHtml(name)}</div>
        <div><strong>Telefon:</strong> ${escapeHtml(phone)}</div>
      `;
    }

    form.style.display = "none";
    successBox?.classList.add("is-visible");
  });

  successBox?.querySelector("[data-close-appointment]")?.addEventListener("click", () => {
    form?.reset();
    resetTimeSelect("Önce tarih seçin");
    successBox.classList.remove("is-visible");
    if (form) form.style.display = "block";
    closeModal();
  });

  // ========================================================
  // BAŞLANGIÇ DURUMU
  // ========================================================

  resetTimeSelect("Önce tarih seçin");
});
