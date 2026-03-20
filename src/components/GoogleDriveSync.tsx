/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';
import { usePortfolio } from '../store/PortfolioContext';
import { getAllAssets, getAllAssetClasses } from '../store/db';
import { Button } from './ui/button';
import { Cloud, CloudUpload, CloudDownload, AlertCircle } from 'lucide-react';

// Note: To make this work in production, you need a valid Google Client ID
// from the Google Cloud Console with Google Drive API enabled.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

export function GoogleDriveSync() {
  const { importAssets, importAssetClasses } = usePortfolio();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenClient, setTokenClient] = useState<any>(null);

  useEffect(() => {
    // Load the Google API client library
    const loadGapi = () => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        (window as any).gapi.load('client', async () => {
          try {
            await (window as any).gapi.client.init({
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
            });
          } catch (err) {
            console.error('Error initializing GAPI client', err);
          }
        });
      };
      document.body.appendChild(script);
    };

    // Load the Google Identity Services library
    const loadGis = () => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (tokenResponse: any) => {
            if (tokenResponse.error !== undefined) {
              setError(tokenResponse.error);
              return;
            }
            setIsAuthorized(true);
            setError(null);
          },
        });
        setTokenClient(client);
      };
      document.body.appendChild(script);
    };

    loadGapi();
    loadGis();
  }, []);

  const handleAuthClick = () => {
    if (CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
      setError('Please set VITE_GOOGLE_CLIENT_ID in your .env file to enable Google Drive Sync.');
      return;
    }
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  };

  const findFile = async () => {
    try {
      const response = await (window as any).gapi.client.drive.files.list({
        q: "name='portfolio_data.json' and trashed=false",
        spaces: 'drive',
        fields: 'files(id, name)',
      });
      const files = response.result.files;
      if (files && files.length > 0) {
        return files[0].id;
      }
      return null;
    } catch (err) {
      console.error('Error finding file', err);
      return null;
    }
  };

  const handleSyncToDrive = async () => {
    if (!isAuthorized) return;
    setIsSyncing(true);
    setError(null);
    try {
      const assets = await getAllAssets();
      const assetClasses = await getAllAssetClasses();
      const fileContent = JSON.stringify({ assets, assetClasses }, null, 2);
      const fileId = await findFile();

      const metadata = {
        name: 'portfolio_data.json',
        mimeType: 'application/json',
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([fileContent], { type: 'application/json' }));

      const accessToken = (window as any).gapi.client.getToken().access_token;

      let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      let method = 'POST';

      if (fileId) {
        url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
        method = 'PATCH';
      }

      const response = await fetch(url, {
        method: method,
        headers: new Headers({ Authorization: 'Bearer ' + accessToken }),
        body: form,
      });

      if (!response.ok) {
        throw new Error('Failed to upload to Google Drive');
      }
      
      alert('Successfully synced to Google Drive!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error syncing to Drive');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncFromDrive = async () => {
    if (!isAuthorized) return;
    setIsSyncing(true);
    setError(null);
    try {
      const fileId = await findFile();
      if (!fileId) {
        throw new Error('portfolio_data.json not found in Google Drive');
      }

      const response = await (window as any).gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media',
      });

      const data = response.result;
      if (Array.isArray(data)) {
        // Legacy support: it was just an array of assets
        await importAssets(data);
        alert('Successfully loaded from Google Drive!');
      } else if (data && data.assets) {
        // New format
        await importAssets(data.assets);
        if (data.assetClasses) {
          await importAssetClasses(data.assetClasses);
        }
        alert('Successfully loaded from Google Drive!');
      } else {
        throw new Error('Invalid data format in Google Drive');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading from Drive');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2">
      {!isAuthorized ? (
        <Button variant="outline" onClick={handleAuthClick} className="w-full sm:w-auto">
          <Cloud className="mr-2 h-4 w-4" />
          Connect Drive
        </Button>
      ) : (
        <>
          <Button variant="outline" onClick={handleSyncToDrive} disabled={isSyncing} className="w-full sm:w-auto">
            <CloudUpload className="mr-2 h-4 w-4" />
            Save to Drive
          </Button>
          <Button variant="outline" onClick={handleSyncFromDrive} disabled={isSyncing} className="w-full sm:w-auto">
            <CloudDownload className="mr-2 h-4 w-4" />
            Load from Drive
          </Button>
        </>
      )}
      {error && (
        <div className="flex items-center text-red-500 text-sm mt-2 sm:mt-0">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}
    </div>
  );
}
