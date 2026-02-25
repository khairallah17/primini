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

          <div className="mb-6 space-y-4">
            <div className="rounded-md bg-blue-50 p-4 text-blue-800">
              <h2 className="font-semibold mb-3 text-lg">Guide d&apos;import CSV/Excel</h2>
              <p className="text-sm mb-4">
                Le fichier CSV ou Excel (.xlsx, .xls) doit contenir les colonnes suivantes. 
                Assurez-vous que la première ligne contient les en-têtes de colonnes.
              </p>
              
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-base mb-1">
                    <span className="text-red-600">*</span> name (REQUIS)
                  </h3>
                  <p className="text-sm mb-2">Nom du produit</p>
                  <ul className="text-xs list-disc list-inside space-y-1 text-blue-700">
                    <li>Doit être unique et descriptif</li>
                    <li>Exemple: &quot;Ordinateur portable HP Pavilion 15&quot;</li>
                    <li>Ne peut pas être vide</li>
                  </ul>
                </div>

                <div className="border-l-4 border-gray-300 pl-4">
                  <h3 className="font-semibold text-base mb-1">description (Optionnel)</h3>
                  <p className="text-sm mb-2">Description détaillée du produit</p>
                  <ul className="text-xs list-disc list-inside space-y-1 text-blue-700">
                    <li>Peut contenir plusieurs phrases</li>
                    <li>Décrivez les caractéristiques principales</li>
                    <li>Exemple: &quot;Ordinateur portable avec processeur Intel Core i5, 8GB RAM, 256GB SSD&quot;</li>
                  </ul>
                </div>

                <div className="border-l-4 border-gray-300 pl-4">
                  <h3 className="font-semibold text-base mb-1">brand (Optionnel)</h3>
                  <p className="text-sm mb-2">Marque du produit</p>
                  <ul className="text-xs list-disc list-inside space-y-1 text-blue-700">
                    <li>Nom de la marque (ex: HP, Dell, Samsung, Apple)</li>
                    <li>Utilisez des noms cohérents pour la même marque</li>
                    <li>Exemple: &quot;HP&quot; ou &quot;Hewlett-Packard&quot;</li>
                  </ul>
                </div>

                <div className="border-l-4 border-gray-300 pl-4">
                  <h3 className="font-semibold text-base mb-1">category (Optionnel)</h3>
                  <p className="text-sm mb-2">Nom de la catégorie principale</p>
                  <ul className="text-xs list-disc list-inside space-y-1 text-blue-700">
                    <li>La catégorie sera créée automatiquement si elle n&apos;existe pas</li>
                    <li>Utilisez des noms de catégories cohérents</li>
                    <li>Exemples: &quot;Informatique&quot;, &quot;Électronique&quot;, &quot;Téléphonie&quot;</li>
                    <li>Respectez la casse et l&apos;orthographe</li>
                  </ul>
                </div>

                <div className="border-l-4 border-gray-300 pl-4">
                  <h3 className="font-semibold text-base mb-1">image (Optionnel)</h3>
                  <p className="text-sm mb-2">URL complète de l&apos;image du produit</p>
                  <ul className="text-xs list-disc list-inside space-y-1 text-blue-700">
                    <li>Doit être une URL valide commençant par http:// ou https://</li>
                    <li>L&apos;image doit être accessible publiquement</li>
                    <li>Exemple: &quot;https://example.com/images/product.jpg&quot;</li>
                    <li>Évitez les URLs avec espaces ou caractères spéciaux</li>
                  </ul>
                </div>

                <div className="border-l-4 border-gray-300 pl-4">
                  <h3 className="font-semibold text-base mb-1">price (Optionnel, mais requis pour créer une offre)</h3>
                  <p className="text-sm mb-2">Prix en Dirhams Marocains (MAD)</p>
                  <ul className="text-xs list-disc list-inside space-y-1 text-blue-700">
                    <li>Format: nombre décimal (utilisez un point pour les décimales)</li>
                    <li>Les symboles &quot;DH&quot;, &quot;MAD&quot; et les virgules seront automatiquement supprimés</li>
                    <li>Exemples valides: &quot;1299.99&quot;, &quot;1,299.99&quot;, &quot;1299.99 MAD&quot;</li>
                    <li>Si le prix est fourni, le champ &quot;merchant&quot; devient également requis</li>
                  </ul>
                </div>

                <div className="border-l-4 border-gray-300 pl-4">
                  <h3 className="font-semibold text-base mb-1">merchant (Optionnel, mais requis si prix fourni)</h3>
                  <p className="text-sm mb-2">Nom du marchand/vendeur</p>
                  <ul className="text-xs list-disc list-inside space-y-1 text-blue-700">
                    <li>Le marchand sera créé automatiquement s&apos;il n&apos;existe pas</li>
                    <li>Utilisez des noms cohérents pour le même marchand</li>
                    <li>Exemples: &quot;ElectroPlanet&quot;, &quot;Jumia&quot;, &quot;Avito&quot;</li>
                    <li>Requis si vous fournissez un prix (pour créer une offre de prix)</li>
                  </ul>
                </div>

                <div className="border-l-4 border-gray-300 pl-4">
                  <h3 className="font-semibold text-base mb-1">url (Optionnel)</h3>
                  <p className="text-sm mb-2">URL du produit sur le site du marchand</p>
                  <ul className="text-xs list-disc list-inside space-y-1 text-blue-700">
                    <li>URL complète vers la page du produit</li>
                    <li>Doit commencer par http:// ou https://</li>
                    <li>Exemple: &quot;https://www.jumia.ma/product-123.html&quot;</li>
                    <li>Utilisé pour créer l&apos;offre de prix si prix et merchant sont fournis</li>
                  </ul>
                </div>

                <div className="border-l-4 border-gray-300 pl-4">
                  <h3 className="font-semibold text-base mb-1">tags (Optionnel)</h3>
                  <p className="text-sm mb-2">Tags pour faciliter la recherche</p>
                  <ul className="text-xs list-disc list-inside space-y-1 text-blue-700">
                    <li>Séparez les tags par des virgules</li>
                    <li>Pas d&apos;espaces après les virgules recommandé</li>
                    <li>Exemple: &quot;portable,gaming,intel,ssd&quot;</li>
                    <li>Les espaces en début/fin seront automatiquement supprimés</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm font-semibold text-yellow-800 mb-1">⚠️ Notes importantes:</p>
                <ul className="text-xs list-disc list-inside space-y-1 text-yellow-700">
                  <li>Les produits créés par les clients nécessitent une approbation admin avant d&apos;être visibles publiquement</li>
                  <li>Les colonnes peuvent être dans n&apos;importe quel ordre, mais les noms doivent correspondre exactement</li>
                  <li>Les lignes vides seront ignorées</li>
                  <li>Pour créer une offre de prix, vous devez fournir à la fois &quot;price&quot; et &quot;merchant&quot;</li>
                  <li>Les erreurs seront affichées avec le numéro de ligne pour faciliter la correction</li>
                </ul>
              </div>

              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm font-semibold text-green-800 mb-2">📋 Exemple de ligne CSV:</p>
                <pre className="text-xs bg-white p-2 rounded border overflow-x-auto text-green-700">
{`name,description,brand,category,image,price,merchant,url,tags
"Ordinateur HP Pavilion 15","PC portable avec Intel i5, 8GB RAM","HP","Informatique","https://example.com/hp.jpg",4999.99,"ElectroPlanet","https://electroplanet.ma/product-123","portable,gaming,intel"`}
                </pre>
              </div>
            </div>
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

