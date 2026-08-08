import React from 'react';
import { useParams } from 'react-router-dom';
import PhotoGallery from '../components/photos/PhotoGallery';
import { Helmet } from 'react-helmet-async';
import { SITE } from '../config/site'

const PhotoLibraryPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();

    return (
        <>
            <Helmet>
                <title>THE LOST+UNFOUNDS | Photo Library | {slug?.replace(/-/g, ' ').toUpperCase()}</title>
                <meta name="description" content="Explore our exclusive high-resolution photography collections available for purchase. Findings from the field, captured in stunning detail for you." />
                <link rel="canonical" href={`${SITE.origin}/photos/${slug || 'kattitude-tattoo'}`} />
            </Helmet>
            <PhotoGallery librarySlug={slug || 'kattitude-tattoo'} />
        </>
    );
};

export default PhotoLibraryPage;
