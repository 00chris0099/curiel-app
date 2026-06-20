import React from 'react';
import FastImage from 'react-native-fast-image';
import { View, StyleSheet, ActivityIndicator } from 'react-native';

/**
 * Componente de imagen con cache optimizado
 * Usa react-native-fast-image para caching agresivo
 */
const CachedImage = ({
    uri,
    style,
    resizeMode = FastImage.resizeMode.cover,
    onLoad,
    onError,
    placeholder
}) => {
    const [loading, setLoading] = React.useState(true);

    return (
        <View style={[styles.container, style]}>
            {loading && (
                <View style={styles.loader}>
                    {placeholder || <ActivityIndicator size="small" color="#1a237e" />}
                </View>
            )}
            <FastImage
                style={[styles.image, style]}
                source={{
                    uri,
                    priority: FastImage.priority.normal,
                    cache: FastImage.cacheControl.immutable
                }}
                resizeMode={resizeMode}
                onLoad={() => setLoading(false)}
                onError={() => setLoading(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden'
    },
    image: {
        width: '100%',
        height: '100%'
    },
    loader: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0'
    }
});

export default React.memo(CachedImage);
