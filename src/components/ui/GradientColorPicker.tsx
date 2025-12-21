'use client';

import { useState } from 'react';

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
    value.startsWith('linear-gradient') || value.startsWith('radial-gradient') ? 'gradient' : 'solid'
  );
  const [solidColor, setSolidColor] = useState(
    value && !value.startsWith('linear-gradient') && !value.startsWith('radial-gradient')
      ? value
      : '#000000'
  );
  const [gradientColor1, setGradientColor1] = useState('#ff0000');
  const [gradientColor2, setGradientColor2] = useState('#0000ff');
  const [gradientAngle, setGradientAngle] = useState(90);

  // Parse existing gradient value if present
  useState(() => {
    if (value.startsWith('linear-gradient')) {
      const match = value.match(/linear-gradient\((\d+)deg,\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}),\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\)/);
      if (match) {
        setGradientAngle(parseInt(match[1]));
        setGradientColor1(match[2]);
        setGradientColor2(match[3]);
      }
    }
  });

  const createChangeEvent = (newValue: string): React.ChangeEvent<HTMLInputElement> => {
    return {
      target: { name, value: newValue },
    } as React.ChangeEvent<HTMLInputElement>;
  };

  const handleModeChange = (newMode: 'solid' | 'gradient') => {
    setMode(newMode);
    if (newMode === 'solid') {
      onChange(createChangeEvent(solidColor));
    } else {
      const gradientValue = `linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${gradientColor2})`;
      onChange(createChangeEvent(gradientValue));
    }
  };

  const handleSolidColorChange = (newColor: string) => {
    setSolidColor(newColor);
    if (mode === 'solid') {
      onChange(createChangeEvent(newColor));
    }
  };

  const handleGradientColor1Change = (newColor: string) => {
    setGradientColor1(newColor);
    if (mode === 'gradient') {
      const gradientValue = `linear-gradient(${gradientAngle}deg, ${newColor}, ${gradientColor2})`;
      onChange(createChangeEvent(gradientValue));
    }
  };

  const handleGradientColor2Change = (newColor: string) => {
    setGradientColor2(newColor);
    if (mode === 'gradient') {
      const gradientValue = `linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${newColor})`;
      onChange(createChangeEvent(gradientValue));
    }
  };

  const handleAngleChange = (newAngle: number) => {
    setGradientAngle(newAngle);
    if (mode === 'gradient') {
      const gradientValue = `linear-gradient(${newAngle}deg, ${gradientColor1}, ${gradientColor2})`;
      onChange(createChangeEvent(gradientValue));
    }
  };

  const currentValue = mode === 'solid' ? solidColor : `linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${gradientColor2})`;

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
            value={solidColor}
            onChange={(e) => handleSolidColorChange(e.target.value)}
            className="w-20 h-10 rounded border border-gray-300 cursor-pointer"
          />
          <input
            type="text"
            value={solidColor}
            onChange={(e) => handleSolidColorChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            dir="ltr"
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 w-20 text-right">رنگ اول:</label>
            <input
              type="color"
              value={gradientColor1}
              onChange={(e) => handleGradientColor1Change(e.target.value)}
              className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={gradientColor1}
              onChange={(e) => handleGradientColor1Change(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              dir="ltr"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 w-20 text-right">رنگ دوم:</label>
            <input
              type="color"
              value={gradientColor2}
              onChange={(e) => handleGradientColor2Change(e.target.value)}
              className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={gradientColor2}
              onChange={(e) => handleGradientColor2Change(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              dir="ltr"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 w-20 text-right">زاویه:</label>
            <input
              type="range"
              min="0"
              max="360"
              value={gradientAngle}
              onChange={(e) => handleAngleChange(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm text-gray-600 w-12 text-left" dir="ltr">
              {gradientAngle}°
            </span>
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
