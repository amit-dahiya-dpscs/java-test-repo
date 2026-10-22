import React, { useState, useEffect } from 'react';
import Pagination from './ui/Pagination';
import DetailsModal from './ui/DetailsModal';
import './SearchResultsTable.css'; 
import dpscsLogo from '../assets/maryland_seal.png';
import { logAuditEvent } from '../services/auditService';
import { getIdentDetail } from '../services/api'; 

const SearchResultsTable = ({ results, pageMetadata, onFetchPage, isLoading, backToSearch, onRecordUpdate, notificationMessage }) => {
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [localNotification, setLocalNotification] = useState(null);

  // --- Derive Pagination State from Spring Boot Metadata ---
  // Spring Boot pages are 0-indexed, but our UI is 1-indexed.
  const currentPage = pageMetadata?.number !== undefined ? pageMetadata.number + 1 : 1;
  const pageSize = pageMetadata?.size || 20;
  const totalPages = pageMetadata?.totalPages || 1;
  
  useEffect(() => {
    if (localNotification) {
      const timer = setTimeout(() => setLocalNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [localNotification]);

  const handleModalClose = () => {
    setSelectedRecord(null);
    const storedNotification = sessionStorage.getItem('expungementNotification');
    if (storedNotification) {
      try {
        const parsed = JSON.parse(storedNotification);
        setLocalNotification({ message: parsed.message, type: parsed.type });
      } catch (e) {
        setLocalNotification({ message: storedNotification, type: 'success' });
      }
      sessionStorage.removeItem('expungementNotification');
    }
  };

  const handleViewClick = async (record) => {
    logAuditEvent('VIEW_DETAIL_CLICK', { sid: record.sidNumber, name: record.formattedName });
    setIsFetchingDetails(true);

    try {
      const response = await getIdentDetail(record.systemId);
      setSelectedRecord(response); 
    } catch (error) {
      console.error("Failed to fetch ident details", error);
      alert("Could not load full details. Please try again.");
    } finally {
      setIsFetchingDetails(false);
    }
  };

  // --- SERVER-SIDE PAGINATION TRIGGERS ---
  const handlePageChange = (newPage) => {
    // Convert the 1-indexed UI page back to 0-indexed for Spring Boot
    onFetchPage(newPage - 1, pageSize);
  };

  const handlePageSizeChange = (newSize) => {
    // Return to the first page when the page size is changed
    onFetchPage(0, newSize);
  };

  const activeNotification = localNotification || notificationMessage;

  return (
    <div className="results-container">
      <div className="results-header">
        <div className="results-title-container">
          <img src={dpscsLogo} alt="DPSCS Seal" className="results-title-logo" />
          <h2>MD CJIS CENTRAL REPOSITORY IDENTIFICATION INDEX SEARCH RESULTS</h2>
        </div>
        <button onClick={backToSearch} className="back-button">Back to Search</button>
      </div>

      {activeNotification && activeNotification.message && (
        <div className={`notification-banner ${activeNotification.type}`} role="alert">
          {activeNotification.message}
        </div>
      )}

      <div className="table-wrapper" style={{ position: 'relative' }}>
        {isLoading && (
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(30, 48, 64, 0.6)', 
                zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center',
                color: 'white', fontWeight: 'bold', fontSize: '1.2rem', backdropFilter: 'blur(2px)'
            }}>
                Loading Page...
            </div>
        )}
        <table style={{ transition: 'opacity 0.2s' }}>
          <thead>
            <tr><th>NAME</th><th>S</th><th>R</th><th>DOB</th><th>PRINT TYPE</th><th>SID</th><th></th></tr>
          </thead>
          <tbody>
            {/* Direct Mapping: No more results.slice() needed! */}
            {results.map((item, index) => (
             <tr key={`${item.sidNumber}-${index}`}>
                <td>
                  {item.formattedName}
                  {item.aliasMatch && (
                    <span className="alias-badge">
                      (Alias)
                    </span>
                  )}
                </td>
                <td>{item.sex}</td>
                <td>{item.race}</td>
                <td>{item.dateOfBirth}</td>
                <td style={{ 
                    fontStyle: (item.printType || item.primaryHenry) ? 'normal' : 'italic',
                    color: (item.printType || item.primaryHenry) ? 'inherit' : '#bdc3c7'
                }}>
                    {item.printType || item.primaryHenry || 'NO FP CARD'}
                </td>
                <td>{item.sidNumber}</td>
                <td>
                  <button className="view-link" onClick={() => handleViewClick(item)} disabled={isFetchingDetails}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        pageSizeOptions={[20, 50, 100]}
      />

      {selectedRecord && (
        <DetailsModal
          data={selectedRecord}
          onClose={handleModalClose}
          onRecordUpdate={onRecordUpdate}
        />
      )}
    </div>
  );
};

export default SearchResultsTable;