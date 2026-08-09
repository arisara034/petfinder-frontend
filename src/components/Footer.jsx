import './Footer.css';

function Footer() {
  return (
    <footer id="Footer-container">
      <div className="footer-content">
        <p className="footer-text">
          © 2026 <span className="brand-highlight">PetFinder AI</span> — ระบบตามหาสัตว์เลี้ยงหายด้วย AI
        </p>
        <div className="footer-links">
          <a href="#about" className="footer-link">เกี่ยวกับเรา</a>
          <a href="#contact" className="footer-link">ติดต่อสอบถาม</a>
          <a href="#privacy" className="footer-link">นโยบายความเป็นส่วนตัว</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;