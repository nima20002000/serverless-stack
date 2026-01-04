'use client';

import { useEffect, useMemo, useState } from 'react';

interface GradientColorPickerProps {
  label?: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

export default function GradientColorPicker({
  label,
  name,
  value,
  onChange,
  placeholder = 'انتخاب رنگ...',
}: GradientColorPickerProps) {
  const [mode, setMode] = useState<'solid' | 'gradient'>(
    value.startsWith('linear-gradient') || value.startsWith('radial-gradient')
      ? 'gradient'
      : 'solid'
  );
  const [baseColor, setBaseColor] = useState(
    value &&
      !value.startsWith('linear-gradient') &&
      !value.startsWith('radial-gradient')
      ? value
      : '#000000'
  );
  const gradientTemplates = useMemo(
    () => [
      {
        id: 'mist',
        label: 'مه نرم',
        build: (color: string) =>
          `linear-gradient(135deg, #ffffff 0%, ${color} 70%)`,
      },
      {
        id: 'silk',
        label: 'ابریشم',
        build: (color: string) =>
          `linear-gradient(45deg, #ffffff 0%, ${color} 55%)`,
      },
      {
        id: 'breeze',
        label: 'نسیم',
        build: (color: string) =>
          `linear-gradient(180deg, #ffffff 0%, ${color} 100%)`,
      },
      {
        id: 'halo',
        label: 'هاله',
        build: (color: string) =>
          `linear-gradient(270deg, #ffffff 0%, ${color} 65%)`,
      },
      {
        id: 'pearl',
        label: 'مروارید',
        build: (color: string) =>
          `linear-gradient(315deg, #ffffff 0%, ${color} 60%, #ffffff 100%)`,
      },
      {
        id: 'stripe',
        label: 'راه راه',
        build: (color: string) =>
          `repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.7) 0 6px, rgba(255, 255, 255, 0) 6px 14px), linear-gradient(0deg, ${color}, ${color})`,
      },
    ],
    []
  );
  const [gradientTemplateId, setGradientTemplateId] = useState(
    gradientTemplates[0].id
  );

  const normalizeGradient = (input: string) =>
    input.replace(/\s+/g, '').toLowerCase();
  const isWhite = (color: string) =>
    color.toLowerCase() === '#ffffff' || color.toLowerCase() === '#fff';

  useEffect(() => {
    if (!value) return;

    if (value.startsWith('linear-gradient')) {
      setMode('gradient');
      const colors = value.match(/#[0-9a-fA-F]{3,6}/g) || [];
      const nonWhite = colors.find((color) => !isWhite(color)) || colors[0];
      if (nonWhite) {
        setBaseColor(nonWhite);
        const match = gradientTemplates.find(
          (template) =>
            normalizeGradient(template.build(nonWhite)) ===
            normalizeGradient(value)
        );
        if (match) {
          setGradientTemplateId(match.id);
        }
      }
    } else if (!value.startsWith('radial-gradient')) {
      setMode('solid');
      setBaseColor(value);
    }
  }, [value, gradientTemplates]);

  const createChangeEvent = (
    newValue: string
  ): React.ChangeEvent<HTMLInputElement> => {
    return {
      target: { name, value: newValue },
    } as React.ChangeEvent<HTMLInputElement>;
  };

  const handleModeChange = (newMode: 'solid' | 'gradient') => {
    setMode(newMode);
    if (newMode === 'solid') {
      onChange(createChangeEvent(baseColor));
    } else {
      const template = gradientTemplates.find(
        (item) => item.id === gradientTemplateId
      );
      if (template) {
        onChange(createChangeEvent(template.build(baseColor)));
      }
    }
  };

  const handleBaseColorChange = (newColor: string) => {
    setBaseColor(newColor);
    if (mode === 'solid') {
      onChange(createChangeEvent(newColor));
      return;
    }
    const template = gradientTemplates.find(
      (item) => item.id === gradientTemplateId
    );
    if (template) {
      onChange(createChangeEvent(template.build(newColor)));
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setGradientTemplateId(templateId);
    if (mode === 'gradient') {
      const template = gradientTemplates.find((item) => item.id === templateId);
      if (template) {
        onChange(createChangeEvent(template.build(baseColor)));
      }
    }
  };

  const currentValue = useMemo(() => {
    if (mode === 'solid') {
      return baseColor;
    }
    const template = gradientTemplates.find(
      (item) => item.id === gradientTemplateId
    );
    return template ? template.build(baseColor) : baseColor;
  }, [mode, baseColor, gradientTemplateId, gradientTemplates]);

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700 text-right">
          {label}
        </label>
      )}

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleModeChange('solid')}
          className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
            mode === 'solid'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          رنگ ساده
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('gradient')}
          className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
            mode === 'gradient'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          گرادیانت
        </button>
      </div>

      {/* Color Inputs */}
      {mode === 'solid' ? (
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={baseColor}
            onChange={(e) => handleBaseColorChange(e.target.value)}
            className="w-20 h-10 rounded border border-gray-300 cursor-pointer"
          />
          <input
            type="text"
            value={baseColor}
            onChange={(e) => handleBaseColorChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            dir="ltr"
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 w-20 text-right">
              رنگ پایه:
            </label>
            <input
              type="color"
              value={baseColor}
              onChange={(e) => handleBaseColorChange(e.target.value)}
              className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={baseColor}
              onChange={(e) => handleBaseColorChange(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {gradientTemplates.map((template) => {
              const isSelected = template.id === gradientTemplateId;
              return (
                <button
                  type="button"
                  key={template.id}
                  onClick={() => handleTemplateChange(template.id)}
                  className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xs text-gray-700">
                    {template.label}
                  </span>
                  <span
                    className="flex-1 h-10 rounded-md border border-gray-200"
                    style={{ background: template.build(baseColor) }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="mt-3">
        <div className="text-sm text-gray-700 mb-2 text-right">پیش‌نمایش:</div>
        <div
          className="w-full h-16 rounded-lg border-2 border-gray-300"
          style={{ background: currentValue }}
        />
      </div>

      {/* Hidden input to match form structure */}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
