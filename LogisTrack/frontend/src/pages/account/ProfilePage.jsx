import React from 'react';

const ProfilePage = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Kullanıcı Profili</h1>
      <div className="bg-white p-8 rounded-lg shadow border border-gray-200">
        <h2 className="text-2xl font-semibold">Sait (Admin)</h2>
        <p className="text-gray-500">sait@logistrack.com</p>
      </div>
    </div>
  );
};

export default ProfilePage;