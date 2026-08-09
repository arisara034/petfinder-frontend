import { useMemo } from 'react';
import locations from '../thaiLocations.json';

function ProvinceDistrictSelect({ province, district, onChange, required = false, allowAll = false, compact = false }) {
  const provinceId = useMemo(() => {
    const match = province ? locations.provinces.find(p => p.name === province) : null;
    return match ? match.id : '';
  }, [province]);

  const districtOptions = useMemo(
    () => locations.districts.filter(d => d.provinceId === provinceId),
    [provinceId]
  );

  const handleProvinceChange = (e) => {
    const id = e.target.value;
    const match = locations.provinces.find(p => p.id === id);
    onChange(match ? match.name : '', '');
  };

  const handleDistrictChange = (e) => {
    onChange(province, e.target.value);
  };

  if (compact) {
    return (
      <>
        <select className="filter-select" value={provinceId} onChange={handleProvinceChange} aria-label="จังหวัด">
          <option value="">{allowAll ? 'ทุกจังหวัด' : '-- เลือกจังหวัด --'}</option>
          {locations.provinces.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select className="filter-select" value={district || ''} onChange={handleDistrictChange} disabled={!provinceId} aria-label="อำเภอ/เขต">
          <option value="">{allowAll ? 'ทุกอำเภอ/เขต' : '-- เลือกอำเภอ/เขต --'}</option>
          {districtOptions.map(d => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>
      </>
    );
  }

  return (
    <div className="form-row">
      <div className="form-group">
        <label className="form-label">จังหวัด</label>
        <select className="form-input" value={provinceId} onChange={handleProvinceChange} required={required}>
          <option value="">{allowAll ? 'ทุกจังหวัด' : '-- เลือกจังหวัด --'}</option>
          {locations.provinces.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">อำเภอ/เขต</label>
        <select className="form-input" value={district || ''} onChange={handleDistrictChange} disabled={!provinceId} required={required}>
          <option value="">{allowAll ? 'ทุกอำเภอ/เขต' : '-- เลือกอำเภอ/เขต --'}</option>
          {districtOptions.map(d => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default ProvinceDistrictSelect;
