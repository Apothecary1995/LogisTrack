import React from 'react';
import TableWrap from '../../components/TableWrap';

const EmployeePage = () => {
  const employees = [
    { id: 1, name: 'Ahmet Yılmaz', role: 'Sürücü', status: 'Aktif' },
    { id: 2, name: 'Mehmet Demir', role: 'Lojistik Uzmanı', status: 'İzinde' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Çalışan Yönetimi</h1>
      <TableWrap title="Personel Listesi">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="p-4 border-b">ID</th>
              <th className="p-4 border-b">Ad Soyad</th>
              <th className="p-4 border-b">Rol</th>
              <th className="p-4 border-b">Durum</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="hover:bg-gray-50 border-b">
                <td className="p-4">{emp.id}</td>
                <td className="p-4 font-medium">{emp.name}</td>
                <td className="p-4">{emp.role}</td>
                <td className="p-4">{emp.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
};

export default EmployeePage;