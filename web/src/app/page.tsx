import CryptographyGame from '@/components/CryptographyGame';
import Link from 'next/link';

export default function Home() {
  return (
    <div>
      {/* Admin Link */}
      <div className="fixed top-4 right-4 z-50">
        <Link 
          href="/admin"
          className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Test Ekranı
        </Link>
      </div>
      
      <CryptographyGame />
    </div>
  );
}