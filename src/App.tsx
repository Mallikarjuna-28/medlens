import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { NewPatient } from './pages/NewPatient';
import { PatientDetail } from './pages/PatientDetail';
import { UploadReport } from './pages/UploadReport';
import { type Patient } from './types';

type Page =
  | { name: 'home' }
  | { name: 'new-patient' }
  | { name: 'patient-detail'; patientId: string; patientName: string }
  | { name: 'upload-report'; patientId: string; patientName: string };

export default function App() {
  const [page, setPage] = useState<Page>({ name: 'home' });

  return (
    <Layout>
      {page.name === 'home' && (
        <Home
          onSelect={(id) => {
            // We don't have the name readily, fetch it — PatientDetail will show it
            setPage({ name: 'patient-detail', patientId: id, patientName: '' });
          }}
          onNewPatient={() => setPage({ name: 'new-patient' })}
        />
      )}

      {page.name === 'new-patient' && (
        <NewPatient
          onBack={() => setPage({ name: 'home' })}
          onCreated={(patient: Patient) =>
            setPage({ name: 'patient-detail', patientId: patient.id, patientName: patient.name })
          }
        />
      )}

      {page.name === 'patient-detail' && (
        <PatientDetail
          patientId={page.patientId}
          onBack={() => setPage({ name: 'home' })}
          onUploadReport={() =>
            setPage({
              name: 'upload-report',
              patientId: page.patientId,
              patientName: page.patientName,
            })
          }
        />
      )}

      {page.name === 'upload-report' && (
        <UploadReport
          patientId={page.patientId}
          patientName={page.patientName}
          onBack={() =>
            setPage({ name: 'patient-detail', patientId: page.patientId, patientName: page.patientName })
          }
          onUploaded={() =>
            setPage({ name: 'patient-detail', patientId: page.patientId, patientName: page.patientName })
          }
        />
      )}
    </Layout>
  );
}
