import React from 'react';

const TableWrap = ({ title, children, actionButton }) => {
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        {actionButton && <div>{actionButton}</div>}
      </div>
      <div className="overflow-x-auto w-full">
        {children}
      </div>
    </div>
  );
};

export default TableWrap;