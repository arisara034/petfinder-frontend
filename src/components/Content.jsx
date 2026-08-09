import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Cont.css';
import { supabase } from '../supabaseClient';
import PetMap from './PetMap';
import PetHeroIllustration from './PetHeroIllustration';
import Icon from './Icon';

function Content() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [adoptPosts, setAdoptPosts] = useState([]);

  const [stats, setStats] = useState({
    foundCount: 0, 
    lostCount: 0,  
    totalPosts: 0  
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(URL.createObjectURL(file));
      setIsScanning(false);
      setScanResult(null);
    }
  };

  const handleStartScan = () => {
    if (!selectedImage) return;
    setIsScanning(true);
    
    setTimeout(() => {
      setIsScanning(false);
      setScanResult({
        matchRate: '96.5%',
        petName: 'น้องถุงเงิน (แมว)',
        location: 'อ.บางใหญ่ จ.นนทบุรี',
      });
    }, 2500);
  };

  const handleReset = () => {
    setSelectedImage(null);
    setIsScanning(false);
    setScanResult(null);
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      // 1. ดึงข้อมูล Adopt Posts (สำหรับแสดงใน Section ล่าง)
      const { data: adoptData } = await supabase.from('adopt_posts').select('*');
      setAdoptPosts(adoptData || []);

      // 2. ดึงข้อมูลสถิติ
      const { count: countFound } = await supabase
        .from('lost_posts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'พบแล้ว');

      const { count: countLost } = await supabase
        .from('lost_posts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'กำลังตามหา');

      const { count: totalAdopt } = await supabase.from('adopt_posts').select('*', { count: 'exact', head: true });
      const { count: totalFound } = await supabase.from('found_posts').select('*', { count: 'exact', head: true });

      setStats({
        foundCount: countFound || 0,
        lostCount: countLost || 0,
        totalPosts: (totalAdopt || 0) + (countLost || 0) + (totalFound || 0)
      });
    };

    fetchDashboardData();
  }, []);

  return (
    <div id="home-page">
      
      {/* 🌟 ZONE 1: Hero Grid ในกล่อง Section ที่มีพื้นหลังตัดสีขาว */}
      <section className="hero-grid-wrapper">
        <div className="container-inner home-grid">
          
          {/* ฝั่งซ้าย: ข้อความต้อนรับ + การ์ดทางเลือกหลัก */}
          <div className="home-left-col">
            <div className="hero-section">
              <h1 className="hero-title">
                พาพวกเขากลับบ้านด้วย <br />
                <span className="text-highlight">PetFinder</span> <Icon name="pawprint" size={32} />
              </h1>
              <p className="hero-subtitle">
                ศูนย์กลางตามหาสัตว์เลี้ยงหลงทาง ระบบจะช่วยสแกนและจับคู่ใบหน้าสัตว์เลี้ยงหายกับเบาะแสที่มีในระบบ
              </p>
            </div>

            <div className="action-container">
              <Link to="/find" className="action-card lost-card">
                <div className="card-icon-wrapper lost-bg"><Icon name="search" size={26} /></div>
                <div className="card-text-content">
                  <h2 className="card-title text-lost">ฉันทำสัตว์เลี้ยงหาย</h2>
                  <p className="card-description">ลงประกาศและใช้ AI ช่วยจับคู่เบาะแส</p>
                </div>
              </Link>

              <Link to="/found" className="action-card found-card">
                <div className="card-icon-wrapper found-bg"><Icon name="home" size={26} /></div>
                <div className="card-text-content">
                  <h2 className="card-title text-found">ฉันพบสัตว์เลี้ยงหลงทาง</h2>
                  <p className="card-description">ถ่ายรูป ปักหมุด ส่งเบาะแสให้เจ้าของ</p>
                </div>
              </Link>
            </div>
          </div>

          {/* ฝั่งขวา: กล่องสแกนอัจฉริยะ AI */}
          <div className="home-right-col">
            <PetHeroIllustration />
            <div className="ai-scanner-box">
              <div className="ai-box-header">
                <h3><Icon name="cpu" size={20} /> สแกนใบหน้าจับคู่ด่วน</h3>
                <p>อัปโหลดรูปน้องเพื่อเทียบฐานข้อมูลทันที</p>
              </div>

              <div className="ai-dropzone-wrapper">
                {!selectedImage ? (
                  <label className="dropzone-label">
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden-input" />
                    <div className="dropzone-content">
                      <span className="upload-icon"><Icon name="camera" size={40} /></span>
                      <h4>คลิกเพื่ออัปโหลดรูปภาพ</h4>
                      <p>แนะนำรูปเห็นใบหน้าน้องชัดเจน</p>
                    </div>
                  </label>
                ) : (
                  <div className="preview-container">
                    <img src={selectedImage} alt="Preview" className="pet-preview-img" />
                    {isScanning && <div className="scanning-laser"></div>}
                    {!isScanning && !scanResult && (
                      <button className="clear-img-btn" onClick={handleReset}>เปลี่ยนรูป</button>
                    )}
                  </div>
                )}
              </div>

              <div className="ai-status-panel">
                {selectedImage && !isScanning && !scanResult && (
                  <button className="start-scan-btn" onClick={handleStartScan}>
                    <Icon name="zap" size={18} /> เริ่มต้นสแกนด้วย AI
                  </button>
                )}

                {isScanning && (
                  <div className="ai-loading">
                    <div className="spinner"></div>
                    <p>AI กำลังวิเคราะห์อัตลักษณ์ใบหน้า...</p>
                  </div>
                )}

                {scanResult && (
                  <div className="ai-success-result">
                    <div className="result-badge-row">
                      <span className="badge-match">Match {scanResult.matchRate}</span>
                    </div>
                    <p><strong>คาดว่าเป็น:</strong> {scanResult.petName}</p>
                    <p><strong>พิกัด:</strong> {scanResult.location}</p>
                    <div className="result-btn-group">
                      <Link to="/find" className="view-detail-btn">ดูรายละเอียด</Link>
                      <button className="reset-scan-btn" onClick={handleReset}>สแกนใหม่</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 🐾 ทางคั่นโซนลายอุ้งเท้า */}
      <div className="paw-divider">
        <Icon name="pawprint" size={18} /><Icon name="pawprint" size={18} /><Icon name="pawprint" size={18} /><Icon name="pawprint" size={18} /><Icon name="pawprint" size={18} />
      </div>

      {/* 📊 ZONE 2: Dashboard แผงสถิติความสำเร็จ */}
      <section className="stats-section">
        <div className="container-inner stats-grid">
          <div className="stat-item">
            <span className="stat-icon"><Icon name="award" size={32} /></span>
            <h2 className="stat-number">{stats.foundCount.toLocaleString()}</h2>
            <p className="stat-label">สัตว์เลี้ยงได้กลับบ้าน</p>
          </div>
          <div className="stat-item">
            <span className="stat-icon"><Icon name="zap" size={32} /></span>
            <h2 className="stat-number">{stats.lostCount.toLocaleString()}</h2>
            <p className="stat-label">ประกาศกำลังตามหา</p>
          </div>
          <div className="stat-item">
            <span className="stat-icon"><Icon name="clipboardList" size={32} /></span>
            <h2 className="stat-number">{stats.totalPosts.toLocaleString()}+</h2>
            <p className="stat-label">ประกาศทั้งหมด</p>
          </div>
        </div>
      </section>

      {/* 🗺️ ZONE 2.5: Interactive Map แผนที่พิกัดสัตว์เลี้ยงสูญหาย */}
      <section className="map-section-home">
        <div className="container-inner">
          <div className="section-title-wrapper">
            <h2><Icon name="map" size={24} /> แผนที่พิกัดสัตว์เลี้ยงในระบบ</h2>
            <p>ดูตำแหน่งประกาศหาย แจ้งพบ และหาบ้านใหม่ ทั้งหมดในพื้นที่ต่างๆ ได้จากแผนที่เดียว</p>
          </div>

          <PetMap />
        </div>
      </section>

      {/* 💡 ZONE 3: How It Works ขั้นตอนการทำงานนวัตกรรมของเรา */}
      <section className="how-it-works">
        <div className="container-inner">
          <div className="section-title-wrapper">
            <h2>ขั้นตอนง่ายๆ ในการตามหาเพื่อนรัก <Icon name="lightbulb" size={24} /></h2>
            <p>ระบบ PetFinder AI ผสานพลังของชุมชนและเทคโนโลยีสแกนอัตลักษณ์เพื่อประสิทธิภาพสูงสุด</p>
          </div>
          
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-num">1</div>
              <h3>ลงข้อมูลประกาศ</h3>
              <p>อัปโหลดรูปภาพและระบุพิกัดล่าสุดที่พบหรือทำหายลงในระบบหลัก</p>
            </div>
            <div className="step-card">
              <div className="step-num">2</div>
              <h3>AI ประมวลผลจับคู่</h3>
              <p>โมเดล YOLO จะสแกนใบหน้าและเปรียบเทียบจุดตัดอัตลักษณ์กับฐานข้อมูลแบบเรียลไทม์</p>
            </div>
            <div className="step-card">
              <div className="step-num">3</div>
              <h3>พาพวกเขากลับบ้าน</h3>
              <p>เมื่อระบบพบข้อมูลที่ตรงกันสูง จะแจ้งเตือนผู้เกี่ยวข้องทันทีเพื่อติดต่อประสานงาน</p>
            </div>
          </div>
        </div>
      </section>

      {/* 🐶 ZONE 4: Featured Adoption สัตว์เลี้ยงตามหาบ้านใหม่ */}
      <section className="featured-adoption">
        <div className="container-inner">
          <div className="section-header-row">
            <div className="header-text">
              <h2><Icon name="pawprint" size={24} /> น้องๆ กำลังรอคอยบ้านใหม่</h2>
              <p>เปิดใจรับเลี้ยงพวกเขา มอบโอกาสและชีวิตใหม่ที่อบอุ่นอีกครั้ง</p>
            </div>
            <Link to="/adopt" className="view-all-adoption-btn">ดูทั้งหมด <Icon name="arrowRight" size={16} /></Link>
          </div>

          <div className="adoption-preview-grid">
            {adoptPosts.length > 0 ? (
              adoptPosts.map((post) => (
                <div key={post.id} className="adoption-preview-card">
                  <div className="adopt-img-badge-wrapper">
                    <img src={post.image_url} alt={post.name} className="adopt-preview-img" />
                    <span className={`gender-badge ${post.gender === 'ผู้' ? 'male' : 'female'}`}>
                      {post.gender === 'ผู้' ? 'ชาย' : 'หญิง'}
                    </span>
                  </div>

                  <div className="post-info">
                    <h3>{post.name}</h3>
                    <p><strong>สายพันธุ์:</strong> {post.breed || 'พันธุ์ทาง'}</p>
                    <p><strong>เพศ:</strong> {post.gender} | <strong>อายุ:</strong> {post.age}</p>
                    <p><Icon name="mapPin" size={14} /> <strong>สถานที่:</strong> {post.location_note}</p>
                    <p><Icon name="phone" size={14} /> <strong>ติดต่อ:</strong> <span style={{ color: '#3182ce', fontWeight: 'bold' }}>{post.contact}</span></p>
                    <p className="adopt-note-text" style={{ marginTop: '8px', color: '#4a5568' }}>{post.note}</p>
                  </div>
                </div>
              ))
            ) : (
              <p>ยังไม่มีรายการประกาศหาบ้านในขณะนี้</p>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}

export default Content;