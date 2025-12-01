'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { uploadProductsCSV } from '../../lib/productApi';
import Link from 'next/link';

function CSVUploadContent() {
  const { tokens } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    message: string;
    success: number;
    approved: number;
    pending: number;
    errors: string[];
    total_errors: number;
  } | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileExt = selectedFile.name.toLowerCase().split('.').pop();
      if (!['csv', 'xlsx', 'xls'].includes(fileExt || '')) {
        setError('Le fichier doit être un CSV ou Excel (.xlsx, .xls)');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !tokens?.key) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const response = await uploadProductsCSV(file, tokens.key);
      setResult(response);
      setFile(null);
      // Reset file input
      const fileInput = document.getElementById('csv-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Une erreur est survenue lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Importer des produits depuis CSV</h1>

          <div className="mb-6 rounded-md bg-blue-50 p-4 text-blue-800">
            <h2 className="font-semibold mb-2">Format requis (CSV ou Excel):</h2>
            <p className="text-sm mb-2">Le fichier CSV ou Excel (.xlsx, .xls) doit contenir les colonnes suivantes:</p>
            <ul className="text-sm list-disc list-inside space-y-1">
              <li><strong>name</strong> (requis) - Nom du produit</li>
              <li><strong>description</strong> - Description du produit</li>
              <li><strong>brand</strong> - Marque</li>
              <li><strong>category</strong> - Nom de la catégorie</li>
              <li><strong>image</strong> - URL de l'image</li>
              <li><strong>price</strong> - Prix en MAD</li>
              <li><strong>merchant</strong> - Nom du marchand</li>
              <li><strong>url</strong> - URL du produit</li>
              <li><strong>tags</strong> - Tags séparés par des virgules</li>
            </ul>
            <p className="text-sm mt-2">
              <strong>Note:</strong> Les produits créés par les clients nécessitent une approbation admin.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">
              {error}
            </div>
          )}

          {result && (
            <div className="mb-4 rounded-md bg-green-50 p-4">
              <div className="font-semibold text-green-800 mb-2">{result.message}</div>
              <div className="text-sm text-green-700 space-y-1">
                <p>✓ Produits créés: {result.success}</p>
                <p>✓ Approuvés: {result.approved}</p>
                <p>⏳ En attente: {result.pending}</p>
                {result.total_errors > 0 && (
                  <p className="text-red-600">✗ Erreurs: {result.total_errors}</p>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="mt-3 text-sm">
                  <p className="font-semibold text-red-600">Erreurs détaillées:</p>
                  <ul className="list-disc list-inside text-red-600 space-y-1">
                    {result.errors.slice(0, 10).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                    {result.errors.length > 10 && (
                      <li>... et {result.errors.length - 10} autres erreurs</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="csv-file" className="block text-sm font-medium text-gray-700 mb-2">
                Sélectionner un fichier CSV
              </label>
              <input
                type="file"
                id="csv-file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
              />
              {file && (
                <p className="mt-2 text-sm text-gray-600">
                  Fichier sélectionné: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <Link
                href="/"
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={!file || uploading}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {uploading ? 'Upload en cours...' : 'Importer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CSVUploadScreen() {
  return <CSVUploadContent />;
}

