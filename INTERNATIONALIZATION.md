# Internationalization (i18n) Guide

This project uses **next-intl** for internationalization, supporting English, Spanish, and Portuguese.

## 🌍 Supported Languages

- 🇺🇸 **English** (`en`) - Default language
- 🇪🇸 **Spanish** (`es`) 
- 🇧🇷 **Portuguese** (`pt`)

## 📁 File Structure

```
├── messages/
│   ├── en.json          # English translations
│   ├── es.json          # Spanish translations
│   └── pt.json          # Portuguese translations
├── i18n.ts              # i18n configuration
├── middleware.ts        # Locale routing middleware
└── components/
    └── LanguageSwitcher.tsx  # Language selector component
```

## 🚀 How to Use

### 1. **In Server Components**

```tsx
import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations();
  
  return (
    <div>
      <h1>{t('common.home')}</h1>
      <p>{t('navigation.welcome')}</p>
    </div>
  );
}
```

### 2. **In Client Components**

```tsx
'use client';
import { useTranslations } from 'next-intl';

export default function MyClientComponent() {
  const t = useTranslations();
  
  return (
    <button>{t('common.save')}</button>
  );
}
```

### 3. **With Parameters**

```tsx
// In translation file (en.json)
{
  "profile": {
    "step": "Step {step} of 6"
  }
}

// In component
const t = useTranslations();
return <p>{t('profile.step', { step: 3 })}</p>;
// Output: "Step 3 of 6"
```

### 4. **Language Switching**

The `LanguageSwitcher` component is already included in the header. Users can select their preferred language from the dropdown.

## 📝 Adding New Translations

### 1. **Add to English (en.json)**

```json
{
  "newSection": {
    "title": "New Title",
    "description": "New description"
  }
}
```

### 2. **Add to Spanish (es.json)**

```json
{
  "newSection": {
    "title": "Nuevo Título",
    "description": "Nueva descripción"
  }
}
```

### 3. **Add to Portuguese (pt.json)**

```json
{
  "newSection": {
    "title": "Novo Título", 
    "description": "Nova descrição"
  }
}
```

## 🔧 Configuration

### **i18n.ts**
- Defines supported locales
- Sets default language
- Configures message loading

### **middleware.ts**
- Handles locale routing
- Redirects users to appropriate language versions
- Integrates with authentication middleware

### **next.config.ts**
- Includes next-intl plugin
- Maintains existing security headers

## 🌐 URL Structure

- **English (default):** `/opportunities`
- **Spanish:** `/es/opportunities` 
- **Portuguese:** `/pt/opportunities`

## 📋 Translation Categories

The translation files are organized into logical sections:

- **common** - Shared UI elements (buttons, labels, etc.)
- **navigation** - Navigation and header content
- **opportunities** - Opportunity-related content
- **auth** - Authentication pages
- **profile** - User profile pages
- **dashboard** - Dashboard content
- **organization** - Organization management
- **causes** - Cause categories
- **skills** - Skill categories
- **timeCommitment** - Time commitment options
- **ageGroups** - Age group options
- **difficultyLevels** - Difficulty level options

## 🎯 Best Practices

1. **Use descriptive keys** - `opportunities.filters.clearAll` instead of `clear`
2. **Group related translations** - Keep related content in the same section
3. **Use parameters for dynamic content** - `{step}` for numbered steps
4. **Maintain consistency** - Use the same key structure across all languages
5. **Test all languages** - Ensure translations work in all supported locales

## 🔍 Testing

1. **Switch languages** using the language switcher in the header
2. **Check URL structure** - Verify locale prefixes work correctly
3. **Test all pages** - Ensure translations appear on all pages
4. **Verify parameters** - Test dynamic content with placeholders

## 🚨 Common Issues

### **Translation not found**
- Check if the key exists in all language files
- Verify the key path is correct
- Ensure the component is using `useTranslations()`

### **Language not switching**
- Check middleware configuration
- Verify locale is in the supported locales array
- Check browser console for errors

### **URL routing issues**
- Ensure middleware is properly configured
- Check that locale prefixes are working
- Verify the matcher pattern in middleware

## 📚 Resources

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Next.js Internationalization](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [ICU Message Format](https://formatjs.io/docs/core-concepts/icu-syntax/) 