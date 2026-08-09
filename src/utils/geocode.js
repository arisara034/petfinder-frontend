import locations from '../thaiLocations.json';

function stripPrefix(str, prefix) {
  if (!str) return '';
  return str.startsWith(prefix) ? str.slice(prefix.length).trim() : str;
}

// แปลงพิกัด (lat, lng) เป็นจังหวัด/อำเภอ โดยอิงชื่อจาก thaiLocations.json
export async function reverseGeocodeProvinceDistrict(lat, lng) {
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/geocode/reverse?lat=${lat}&lon=${lng}`);
    if (!res.ok) return { province: '', district: '' };

    const data = await res.json();
    const address = data.address || {};

    let provinceRaw = '';
    let districtRaw = '';

    if (address.province) {
      provinceRaw = stripPrefix(address.province, 'จังหวัด');
      districtRaw = stripPrefix(address.county, 'อำเภอ');
    } else if (address.city === 'กรุงเทพมหานคร') {
      provinceRaw = 'กรุงเทพมหานคร';
      districtRaw = stripPrefix(address.suburb, 'เขต');
    }

    const provinceMatch = locations.provinces.find(p => p.name === provinceRaw);
    if (!provinceMatch) return { province: '', district: '' };

    const districtMatch = locations.districts.find(
      d => d.provinceId === provinceMatch.id && d.name === districtRaw
    );

    return { province: provinceMatch.name, district: districtMatch ? districtMatch.name : '' };
  } catch (err) {
    console.error('Reverse geocoding failed:', err);
    return { province: '', district: '' };
  }
}
