import React from 'react';
import TableWrap from '../../components/TableWrap';

const ServiceRepairPage = () => {
  const records = [
    { id: 'SRV-001', vehicle: '34 ABC 123', issue: 'Fren Bakımı', cost: '2500 TL', date: '2026-05-20' },
    { id: 'SRV-002', vehicle: '06 XYZ 987', issue: 'Yağ Değişimi', cost: '1200 TL', date: '2026-05-22' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Servis ve Tamir İşlemleri</h1>
      <TableWrap title="Son Onarım Kayıtları">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="p-4 border-b">Kayıt No</th>
              <th className="p-4 border-b">Araç Plaka</th>
              <th className="p-4 border-b">İşlem</th>
              <th className="p-4 border-b">Tutar</th>
              <th className="p-4 border-b">Tarih</th>
            </tr>
          </thead>
          <tbody>
            {records.map(rec => (
              <tr key={rec.id} className="hover:bg-gray-50 border-b">
                <td className="p-4 font-mono text-sm">{rec.id}</td>
                <td className="p-4 font-bold">{rec.vehicle}</td>
                <td className="p-4">{rec.issue}</td>
                <td className="p-4 text-red-600 font-semibold">{rec.cost}</td>
                <td className="p-4 text-gray-500">{rec.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
};

export default ServiceRepairPage;