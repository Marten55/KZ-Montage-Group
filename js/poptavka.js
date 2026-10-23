/*!
 * poptavka.js — dopytový formulár a mobilná lišta „Poptat montáž“.
 * Bez knižníc, rovnaký štýl ako galerie.js.
 */
(function () {
  'use strict';

  var form = document.getElementById('poptavka');
  if (!form) return;

  var status = form.querySelector('.poptavka__status');
  var button = form.querySelector('button[type="submit"]');
  var buttonText = button.textContent;

  // Vlastná kontrola namiesto bublín prehliadača: tie vyzerajú v každom prehliadači inak
  // a nedajú sa preložiť do jazyka stránky.
  var rules = [
    { id: 'pp-jmeno', ok: function (v) { return v.trim().length >= 2; } },
    { id: 'pp-email', ok: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); } },
    { id: 'pp-popis', ok: function (v) { return v.trim().length >= 10; } }
  ];

  function check(rule) {
    var input = document.getElementById(rule.id);
    var error = document.getElementById(rule.id + '-err');
    var valid = rule.ok(input.value);
    input.setAttribute('aria-invalid', valid ? 'false' : 'true');
    if (valid) input.removeAttribute('aria-describedby');
    else input.setAttribute('aria-describedby', error.id);
    error.classList.toggle('is-visible', !valid);
    return valid;
  }

  // Chybu opravujeme priebežne až vtedy, keď ju človek raz videl. Skôr by kričala pri prvom písmene.
  rules.forEach(function (rule) {
    document.getElementById(rule.id).addEventListener('input', function () {
      if (this.getAttribute('aria-invalid') === 'true') check(rule);
    });
  });

  function show(message, isError) {
    status.innerHTML = message;
    status.classList.toggle('is-error', isError);
    status.hidden = false;
  }

  function done() {
    button.disabled = false;
    button.textContent = buttonText;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var firstInvalid = null;
    rules.forEach(function (rule) {
      if (!check(rule) && !firstInvalid) firstInvalid = document.getElementById(rule.id);
    });
    if (firstInvalid) { firstInvalid.focus(); return; }

    // Robot vyplnil skryté pole: tvárime sa, že prešlo, aby neskúšal ďalej
    if (form.web.value) { form.reset(); show('Děkujeme, poptávka odešla.', false); return; }

    button.disabled = true;
    button.textContent = 'Odesílám…';
    status.hidden = true;

    if (form.hasAttribute('data-nahled')) {
      setTimeout(function () {
        done();
        show('<strong>Náhled:</strong> v ostré verzi by teď poptávka odešla na váš e-mail. Nic se neodeslalo.', false);
      }, 600);
      return;
    }

    fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      // Úspech len pri {"ok":true}. Samotný status 200 nestačí: keď PHP spadne a hosting má
      // zapnuté zobrazovanie chýb, vráti 200 s textom chyby a človek by videl falošné „odešla“.
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || data.ok !== true) throw new Error('neodoslané');
        form.reset();
        show('<strong>Děkujeme, poptávka odešla.</strong> Ozveme se vám e-mailem.', false);
      })
      .catch(function () {
        // Dopyt sa nesmie stratiť potichu: človek musí vedieť, že neodišiel, a mať náhradný kontakt.
        // Vyplnené polia necháme, nech nemusí písať znova.
        show('<strong>Poptávku se nepodařilo odeslat.</strong> Zkuste to prosím znovu, nebo zavolejte na ' +
          '<a href="tel:+420733583700">+420 733 583 700</a> či napište na ' +
          '<a href="mailto:donakamilo@gmail.com">donakamilo@gmail.com</a>.', true);
      })
      .then(done);
  });

  // Mobilná lišta: zobraz po opustení úvodnej obrazovky, skry pri kontakte (formulár je už na očiach)
  var bar = document.querySelector('.cta-float');
  var hero = document.getElementById('hero');
  var contact = document.getElementById('contact');
  if (!bar || !hero || !contact || !('IntersectionObserver' in window)) return;

  var heroVisible = true;
  var contactVisible = false;
  function update() { bar.hidden = heroVisible || contactVisible; }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.target === hero) heroVisible = entry.isIntersecting;
      if (entry.target === contact) contactVisible = entry.isIntersecting;
    });
    update();
  });
  observer.observe(hero);
  observer.observe(contact);
})();
