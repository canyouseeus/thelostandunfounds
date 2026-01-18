import AdminGalleryView from '../components/admin/AdminGalleryView';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function PhotographerDashboard() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && !user) {
            navigate('/');
        }
    }, [user, loading, navigate]);

    if (loading) return <div className="p-8 text-center text-white">Loading...</div>;

    return (
        <div className="container mx-auto py-8 text-white px-4">
            <div className="mb-6">
                <h1 className="text-3xl font-bold uppercase tracking-tighter">My Galleries</h1>
                <p className="text-zinc-400">Manage your photo galleries and settings</p>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                <AdminGalleryView
                    onBack={() => { }}
                    isPhotographerView={true}
                />
            </div>
        </div>
    );
}
