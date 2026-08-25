/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, ProductVariant } from './types';

export interface FormulationPreset {
  id: string;
  label: string;
  form: string;
  image: string;
  galleryImages?: string[];
  description: string;
}

export const FORMULATION_PRESET_IMAGES: FormulationPreset[] = [
  {
    id: 'tablet',
    label: 'Tablets / Vati (Bottle)',
    form: 'tablet',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800',
    galleryImages: [
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1550572017-ed200f5e6343?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&q=80&w=800'
    ],
    description: 'Apothecary tablet bottle with botanical wellness tablets / vati'
  },
  {
    id: 'oil',
    label: 'Taila / Oil (Dropper Flask)',
    form: 'oil',
    image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&q=80&w=800',
    galleryImages: [
      'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&q=80&w=800'
    ],
    description: 'Amber glass dropper bottle for facial elixirs and therapeutic oils'
  },
  {
    id: 'hair_oil',
    label: 'Hair Taila / Massage Oil Bottle',
    form: 'oil',
    image: 'https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&q=80&w=800',
    galleryImages: [
      'https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1608248597358-1f09564f26b5?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=800'
    ],
    description: 'Herb-infused therapy oil bottle for hair and scalp wellness'
  },
  {
    id: 'churna',
    label: 'Churna / Herbal Powder Jar',
    form: 'churna',
    image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=800',
    galleryImages: [
      'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=800'
    ],
    description: 'Traditional apothecary glass/ceramic jar with organic powdered herbs'
  },
  {
    id: 'liquid',
    label: 'Syrup / Arishta Tonic Bottle',
    form: 'liquid',
    image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800',
    galleryImages: [
      'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'
    ],
    description: 'Medicinal herbal tonic / kadha / arishta bottle'
  },
  {
    id: 'cream',
    label: 'Lepa / Beauty Cream Jar',
    form: 'cream',
    image: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&q=80&w=800',
    galleryImages: [
      'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800'
    ],
    description: 'Herbal cosmetic cream / moisturizer / paste jar'
  },
  {
    id: 'capsule',
    label: 'Vegetarian Capsules Jar',
    form: 'capsule',
    image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&q=80&w=800',
    galleryImages: [
      'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800'
    ],
    description: 'Apothecary jar with plant-derived herbal capsules'
  }
];

export function detectFormulationType(variant?: ProductVariant, parentProduct?: Product): string {
  if (!variant) return 'tablet';

  const combinedText = [
    variant.form || '',
    variant.formType || '',
    variant.name || '',
    variant.size || '',
    variant.netQuantity || '',
    variant.sku || '',
    variant.description || '',
    parentProduct?.subcategory || '',
    parentProduct?.category || ''
  ].join(' ').toLowerCase();

  if (combinedText.includes('tablet') || combinedText.includes('vati') || combinedText.includes('gutika') || combinedText.includes('tab')) {
    return 'tablet';
  }
  if (combinedText.includes('capsule') || combinedText.includes('cap')) {
    return 'capsule';
  }
  if (combinedText.includes('hair oil') || combinedText.includes('bhringraj oil')) {
    return 'hair_oil';
  }
  if (combinedText.includes('oil') || combinedText.includes('taila') || combinedText.includes('tailam') || combinedText.includes('serum') || combinedText.includes('dropper')) {
    return 'oil';
  }
  if (combinedText.includes('churna') || combinedText.includes('powder') || combinedText.includes('bhasma') || combinedText.includes('podi') || combinedText.includes('churn')) {
    return 'churna';
  }
  if (combinedText.includes('cream') || combinedText.includes('lepa') || combinedText.includes('gel') || combinedText.includes('paste') || combinedText.includes('ointment')) {
    return 'cream';
  }
  if (combinedText.includes('syrup') || combinedText.includes('tonic') || combinedText.includes('arishta') || combinedText.includes('asava') || combinedText.includes('kwath') || combinedText.includes('kadha') || combinedText.includes('liquid') || combinedText.includes('ml')) {
    return 'liquid';
  }

  return 'tablet';
}

export function getVariantImage(variant?: ProductVariant, parentProduct?: Product): string {
  if (variant?.image && variant.image.trim()) {
    return variant.image.trim();
  }

  if (variant) {
    const detected = detectFormulationType(variant, parentProduct);
    const matchedPreset = FORMULATION_PRESET_IMAGES.find(p => p.id === detected || p.form === detected);
    if (matchedPreset) {
      return matchedPreset.image;
    }
  }

  return parentProduct?.mainImage || FORMULATION_PRESET_IMAGES[0].image;
}

export function getVariantGalleryImages(variant?: ProductVariant, parentProduct?: Product): string[] {
  const result: string[] = [];

  const addImage = (img?: string) => {
    if (img && typeof img === 'string') {
      const trimmed = img.trim();
      if (trimmed && !result.includes(trimmed)) {
        result.push(trimmed);
      }
    }
  };

  // 1. Variant primary image
  if (variant?.image && variant.image.trim()) {
    addImage(variant.image.trim());
  }

  // 2. Variant specific gallery images
  if (variant?.images && Array.isArray(variant.images)) {
    variant.images.forEach(img => addImage(img));
  }

  // 3. Formulation preset perspective gallery
  if (variant) {
    const formType = detectFormulationType(variant, parentProduct);
    const preset = FORMULATION_PRESET_IMAGES.find(p => p.id === formType || p.form === formType);
    if (preset) {
      addImage(preset.image);
      if (preset.galleryImages) {
        preset.galleryImages.forEach(img => addImage(img));
      }
    }
  }

  // 4. Parent product main image
  if (parentProduct?.mainImage) {
    addImage(parentProduct.mainImage);
  }

  // 5. Parent product additional images
  if (parentProduct?.images && Array.isArray(parentProduct.images)) {
    parentProduct.images.forEach(img => addImage(img));
  }

  if (result.length === 0) {
    result.push(FORMULATION_PRESET_IMAGES[0].image);
  }

  return result;
}
