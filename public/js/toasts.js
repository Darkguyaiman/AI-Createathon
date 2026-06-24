(() => {
  const toasts = Array.from(document.querySelectorAll('[data-toast]'));
  if (!toasts.length) return;

  const hideToast = (toast) => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-6px)';
    toast.style.pointerEvents = 'none';

    window.setTimeout(() => {
      toast.remove();
    }, 300);
  };

  toasts.forEach(toast => {
    const timer = window.setTimeout(() => hideToast(toast), 5000);

    toast.addEventListener('mouseenter', () => window.clearTimeout(timer), { once: true });
  });
})();
