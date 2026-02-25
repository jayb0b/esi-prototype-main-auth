<template>
  <footer class="footer">
    <div class="footer-inner">
      <a href="https://www.silphium.co.uk" class="footer-link">ESI.info</a>
      <a href="https://www.buttonface.co.uk" class="footer-link">External Works</a>
      <a href="https://www.jaybob.website" class="footer-link">Enviropro</a>
    </div>
  </footer>
</template>

<style scoped>
  .footer {
    border-top: 1px solid #e5e7eb;
    padding: 0 2rem;
    font-family: system-ui, sans-serif;
  }

  .footer-inner {
    max-width: 1100px;
    margin: 0 auto;
    height: 48px;
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .footer-link {
    font-size: 0.875rem;
    color: #555555;
    text-decoration: none;
  }

  .footer-link:hover {
    color: #111827;
  }
</style>
