(() => {
  const visible = (element) => {
    const style = window.getComputedStyle(element);
    return style.display !== "none" &&
      style.visibility !== "hidden" &&
      element.getClientRects().length > 0;
  };

  const fields = () => Array.from(document.querySelectorAll("input, textarea"))
    .filter((element) => !element.disabled && !element.readOnly && visible(element));

  const description = (element) => {
    const id = element.id;
    const explicitLabel = id
      ? Array.from(document.querySelectorAll("label[for]"))
        .find((label) => label.htmlFor === id)?.innerText
      : "";
    const wrappingLabel = element.closest("label")?.innerText ?? "";
    return [
      explicitLabel,
      wrappingLabel,
      element.getAttribute("aria-label"),
      element.getAttribute("placeholder"),
      element.getAttribute("name"),
      element.id,
    ].filter(Boolean).join(" ").toLowerCase().replace(/[_-]+/g, " ");
  };

  const find = (allFields, pattern, types) => allFields.find((element) => {
    const type = element instanceof HTMLInputElement ? element.type : "textarea";
    return types.includes(type) && pattern.test(description(element));
  });

  const setValue = (element, value) => {
    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (!setter) return false;
    setter.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  };

  const setResumeFile = (data, form) => {
    const fileInput = Array.from(form.querySelectorAll('input[type="file"]'))
      .filter((element) => !element.disabled && visible(element))
      .find((element) => {
        const label = description(element);
        return /\b(resume|cv|curriculum vitae)\b/.test(label);
      });
    if (!fileInput || !data.resumePdf?.base64) return false;

    const binary = atob(data.resumePdf.base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    const file = new File([bytes], data.resumePdf.filename || "Resume.pdf", {
      type: data.resumePdf.mimeType || "application/pdf",
    });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.files = transfer.files;
    fileInput.dispatchEvent(new Event("input", { bubbles: true }));
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  };

  const hasCaptcha = () => Array.from(document.querySelectorAll(
    'iframe, [class*="captcha" i], [id*="captcha" i], [name*="captcha" i], [class*="recaptcha" i]'
  )).some((element) => {
    const value = `${element.getAttribute("src") ?? ""} ${element.getAttribute("class") ?? ""} ${element.id}`;
    return /captcha|recaptcha|hcaptcha|turnstile/i.test(value);
  });

  const waitForSubmissionConfirmation = async (form) => {
    const confirmation = /\b(thank you for applying|thanks for applying|application submitted|application received|your application has been submitted)\b/i;
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      const text = document.body?.innerText ?? "";
      if (confirmation.test(text) && !form.isConnected) return true;
      if (confirmation.test(text)) {
        const formText = form.innerText ?? "";
        if (!confirmation.test(formText)) return true;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 500));
    }
    return false;
  };

  const fillApplication = (data) => {
    const personal = data.cv.personalInfo;
    const allFields = fields();
    const filled = [];
    const firstName = personal.name.trim().split(/\s+/)[0] ?? "";
    const lastName = personal.name.trim().split(/\s+/).slice(1).join(" ");

    const add = (label, element, value) => {
      if (element && value && setValue(element, value)) filled.push(label);
    };

    const email = find(allFields, /\bemail\b/, ["email", "text"]);
    add("Email", email, personal.email);

    const phone = find(allFields, /\b(phone|mobile|telephone)\b/, ["tel", "text"]);
    add("Phone", phone, personal.phone);

    const first = find(allFields, /\b(first|given)\s*name\b/, ["text"]);
    const last = find(allFields, /\b(last|family|sur)\s*name\b/, ["text"]);
    if (first && last) {
      add("First name", first, firstName);
      add("Last name", last, lastName);
    } else {
      const fullName = find(allFields, /\b(full|applicant|candidate)\s+name\b/, ["text"]) ??
        allFields.find((element) => {
          if (!(element instanceof HTMLInputElement) || element.type !== "text") return false;
          return /^(name|full.?name|applicant.?name)$/i.test(element.name) ||
            /^(name|full.?name|applicant.?name)$/i.test(element.id);
        });
      add("Name", fullName, personal.name);
    }

    const linkedin = find(allFields, /\blinked[\s_-]?in\b/, ["url", "text"]);
    add("LinkedIn", linkedin, personal.linkedin);

    const location = find(allFields, /\b(city|current location|location)\b/, ["text"]);
    add("Location", location, personal.location);

    const coverLetter = find(allFields, /\bcover letter\b/, ["textarea"]);
    add("Cover letter", coverLetter, data.coverLetter.content);

    const form = (email ?? phone ?? first ?? last ?? coverLetter)?.form ??
      document.querySelector("form");
    if (!form) {
      return { submitted: false, filled, reason: "Form lamaran tidak ditemukan." };
    }
    if (hasCaptcha()) {
      return { submitted: false, filled, reason: "CAPTCHA terdeteksi; perlu diselesaikan manual." };
    }

    const resumeUploaded = setResumeFile(data, form);
    if (resumeUploaded) filled.push("Resume PDF");

    const requiredControls = Array.from(form.querySelectorAll("input, select, textarea"))
      .filter((element) =>
        (element.required || element.getAttribute("aria-required") === "true") &&
        visible(element) &&
        !["submit", "button", "reset", "hidden"].includes(
          element instanceof HTMLInputElement ? element.type : ""
        )
      );
    const unknownRequired = requiredControls.filter((element) => {
      if (element instanceof HTMLInputElement && ["checkbox", "radio"].includes(element.type)) return true;
      if (element instanceof HTMLSelectElement) return true;
      return !element.checkValidity();
    });
    if (unknownRequired.length > 0 || !form.checkValidity()) {
      return {
        submitted: false,
        filled,
        reason: `${unknownRequired.length || 1} field wajib belum lengkap atau tidak didukung; tidak dikirim.`,
      };
    }

    const submitButton = Array.from(form.querySelectorAll('button[type="submit"], input[type="submit"]'))
      .find((element) => {
        if (element.disabled || !visible(element)) return false;
        const label = element instanceof HTMLInputElement ? element.value : element.innerText;
        return /\b(apply|submit|send application|lamar)\b/i.test(label);
      });
    if (!submitButton) {
      return { submitted: false, filled, reason: "Tombol submit yang jelas tidak ditemukan." };
    }
    return { submitted: true, filled, form, submitButton };
  };

  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message?.type !== "CV_OPTIMIZER_FILL") return false;

    const host = window.location.hostname;
    const supported =
      host === "boards.greenhouse.io" ||
      host === "job-boards.greenhouse.io" ||
      host === "jobs.lever.co";
    if (!supported) {
      respond({ ok: false, error: "Halaman ini bukan form Greenhouse atau Lever yang didukung." });
      return false;
    }

    try {
      const result = fillApplication(message.data);
      if (!result.submitted) {
        respond({ ok: true, ...result });
        return false;
      }
      result.submitButton.click();
      void waitForSubmissionConfirmation(result.form).then((confirmed) => {
        respond({
          ok: true,
          submitted: confirmed,
          filled: result.filled,
          reason: confirmed
            ? "ATS menampilkan konfirmasi pengiriman."
            : "Klik submit dilakukan, tetapi konfirmasi ATS tidak terdeteksi. Periksa status secara manual sebelum mencoba lagi.",
        });
      });
      return true;
    } catch {
      respond({ ok: false, error: "Form gagal diisi. Coba refresh halaman dan isi field secara manual." });
    }
    return false;
  });
})();
