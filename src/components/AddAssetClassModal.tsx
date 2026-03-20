import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { AssetClassDef } from '../store/db';
import { usePortfolio } from '../store/PortfolioContext';
import { AssetClassLogo } from '../lib/assetClassBranding';
import { ImagePlus, Link2, Trash2 } from 'lucide-react';

interface AddAssetClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classToEdit?: AssetClassDef | null;
}

const COUNTRIES = ['India', 'Canada'];

export function AddAssetClassModal({ open, onOpenChange, classToEdit }: AddAssetClassModalProps) {
  const { addAssetClass, updateAssetClass } = usePortfolio();
  const [country, setCountry] = useState('India');
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      if (classToEdit) {
        setCountry(classToEdit.country);
        setName(classToEdit.name);
        setImageUrl(classToEdit.image || '');
      } else {
        setCountry('India');
        setName('');
        setImageUrl('');
      }
    }
  }, [open, classToEdit]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (classToEdit) {
      await updateAssetClass({
        ...classToEdit,
        country,
        name,
        image: imageUrl.trim() || undefined,
      });
    } else {
      await addAssetClass({
        country,
        name,
        image: imageUrl.trim() || undefined,
      });
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{classToEdit ? 'Edit Asset Class' : 'Add Asset Class'}</DialogTitle>
        <DialogDescription>
          {classToEdit ? 'Update the details for this asset class.' : 'Create a new asset class for your portfolio.'}
        </DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4 pt-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Country</label>
          <Select value={country} onChange={(e) => setCountry(e.target.value)} required>
            {COUNTRIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Asset Class Name</label>
          <Input 
            required 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="e.g. Mutual Funds, Stocks, TFSA" 
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">Class Logo</label>
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <AssetClassLogo name={name || 'Asset Class'} image={imageUrl || undefined} className="h-16 w-16 shrink-0" />
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {imageUrl ? 'Using your custom image for this asset class.' : 'Using an automatic colorful logo based on the class name.'}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Image URL</label>
            <div className="relative">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="pr-10"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <Link2 className="h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <ImagePlus className="mr-2 h-4 w-4" />
              Upload Image
            </Button>
            {imageUrl && (
              <Button type="button" variant="outline" onClick={() => setImageUrl('')}>
                <Trash2 className="mr-2 h-4 w-4" />
                Remove Image
              </Button>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-full px-6">Cancel</Button>
          <Button type="submit" className="bg-[#00875A] hover:bg-[#007A51] text-white rounded-full px-6">
            {classToEdit ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
