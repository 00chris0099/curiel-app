import React, { useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    Image,
    Easing,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const CURIEL_BLUE = '#1a237e';
const GLOW_COLOR = 'rgba(41, 78, 111, 0.4)';

const AnimatedImage = Animated.createAnimatedComponent(Image);

/**
 * Splash animado que tambien funciona como loading screen.
 * - mode='splash': se ejecuta una vez y llama onFinish
 * - mode='loading': se queda visible mientras children carga
 */
const LoadingSplash = ({ onFinish, mode = 'splash' }) => {
    const bgScale = useRef(new Animated.Value(1.08)).current;
    const bgOpacity = useRef(new Animated.Value(0)).current;

    const logoScale = useRef(new Animated.Value(0)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoRotate = useRef(new Animated.Value(0)).current;

    const ring1Scale = useRef(new Animated.Value(0.5)).current;
    const ring1Opacity = useRef(new Animated.Value(0)).current;
    const ring2Scale = useRef(new Animated.Value(0.5)).current;
    const ring2Opacity = useRef(new Animated.Value(0)).current;

    const glowOpacity = useRef(new Animated.Value(0)).current;
    const glowScale = useRef(new Animated.Value(0.8)).current;

    const titleY = useRef(new Animated.Value(30)).current;
    const titleOpacity = useRef(new Animated.Value(0)).current;
    const titleLetterSpacing = useRef(new Animated.Value(0)).current;

    const subtitleY = useRef(new Animated.Value(20)).current;
    const subtitleOpacity = useRef(new Animated.Value(0)).current;

    const lineLeftX = useRef(new Animated.Value(-width * 0.3)).current;
    const lineRightX = useRef(new Animated.Value(width * 0.3)).current;
    const lineOpacity = useRef(new Animated.Value(0)).current;

    const dotGridOpacity = useRef(new Animated.Value(0)).current;

    const exitOpacity = useRef(new Animated.Value(1)).current;
    const exitScale = useRef(new Animated.Value(1)).current;

    const glowLoopRef = useRef(null);

    const cleanup = useCallback(() => {
        if (glowLoopRef.current) {
            glowLoopRef.current.stop();
            glowLoopRef.current = null;
        }
    }, []);

    useEffect(() => {
        runAnimation();
        return cleanup;
    }, []);

    const runAnimation = () => {
        // STAGE 1: Background fade + scale
        Animated.parallel([
            Animated.timing(bgOpacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.spring(bgScale, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();

        // STAGE 2: Logo entrance with spring bounce
        setTimeout(() => {
            Animated.parallel([
                Animated.spring(logoScale, {
                    toValue: 1,
                    friction: 4,
                    tension: 50,
                    useNativeDriver: true,
                }),
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(logoRotate, {
                    toValue: 1,
                    duration: 500,
                    easing: Easing.out(Easing.back(1.5)),
                    useNativeDriver: true,
                }),
            ]).start();
        }, 250);

        // STAGE 2b: Ring 1 expands
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(ring1Scale, {
                    toValue: 2.5,
                    duration: 800,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(ring1Opacity, {
                    toValue: 0.6,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                Animated.timing(ring1Opacity, {
                    toValue: 0,
                    duration: 350,
                    useNativeDriver: true,
                }).start();
            });
        }, 350);

        // STAGE 2c: Ring 2 expands (staggered)
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(ring2Scale, {
                    toValue: 3,
                    duration: 900,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(ring2Opacity, {
                    toValue: 0.4,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                Animated.timing(ring2Opacity, {
                    toValue: 0,
                    duration: 350,
                    useNativeDriver: true,
                }).start();
            });
        }, 500);

        // STAGE 2d: Glow pulse loop
        setTimeout(() => {
            glowLoopRef.current = Animated.loop(
                Animated.sequence([
                    Animated.parallel([
                        Animated.timing(glowOpacity, {
                            toValue: 0.5,
                            duration: 700,
                            useNativeDriver: true,
                        }),
                        Animated.timing(glowScale, {
                            toValue: 1.15,
                            duration: 700,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.parallel([
                        Animated.timing(glowOpacity, {
                            toValue: 0.15,
                            duration: 700,
                            useNativeDriver: true,
                        }),
                        Animated.timing(glowScale, {
                            toValue: 0.85,
                            duration: 700,
                            useNativeDriver: true,
                        }),
                    ]),
                ])
            );
            glowLoopRef.current.start();
        }, 400);

        // STAGE 3: Title "CURIEL" slides up
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(titleY, {
                    toValue: 0,
                    duration: 500,
                    easing: Easing.out(Easing.back(1.2)),
                    useNativeDriver: true,
                }),
                Animated.timing(titleOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(titleLetterSpacing, {
                    toValue: 14,
                    duration: 700,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]).start();
        }, 700);

        // STAGE 4: Decorative lines
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(lineLeftX, {
                    toValue: 0,
                    duration: 400,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(lineRightX, {
                    toValue: 0,
                    duration: 400,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(lineOpacity, {
                    toValue: 0.3,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        }, 1000);

        // STAGE 5: Subtitle
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(subtitleY, {
                    toValue: 0,
                    duration: 400,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(subtitleOpacity, {
                    toValue: 0.7,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]).start();
        }, 1100);

        // STAGE 6: Dot grid
        setTimeout(() => {
            Animated.timing(dotGridOpacity, {
                toValue: 0.06,
                duration: 500,
                useNativeDriver: true,
            }).start();
        }, 1200);

        // STAGE 7: Exit (splash mode only)
        if (mode === 'splash') {
            setTimeout(() => {
                Animated.parallel([
                    Animated.timing(exitOpacity, {
                        toValue: 0,
                        duration: 450,
                        useNativeDriver: true,
                    }),
                    Animated.timing(exitScale, {
                        toValue: 1.04,
                        duration: 450,
                        easing: Easing.in(Easing.cubic),
                        useNativeDriver: true,
                    }),
                ]).start(() => {
                    cleanup();
                    onFinish && onFinish();
                });
            }, 2800);
        }
    };

    const spin = logoRotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['90deg', '0deg'],
    });

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: exitOpacity,
                    transform: [{ scale: exitScale }],
                },
            ]}
        >
            <AnimatedImage
                source={require('../../assets/splash.jpeg')}
                style={[
                    styles.bgImage,
                    {
                        opacity: bgOpacity,
                        transform: [{ scale: bgScale }],
                    },
                ]}
                resizeMode="cover"
            />

            <View style={styles.gradientOverlay} />

            <Animated.View style={[styles.dotGrid, { opacity: dotGridOpacity }]}>
                {Array.from({ length: 12 }).map((_, row) =>
                    Array.from({ length: 7 }).map((_, col) => (
                        <View
                            key={`${row}-${col}`}
                            style={[
                                styles.dot,
                                {
                                    top: row * (height / 12),
                                    left: col * (width / 7) + (width / 14),
                                },
                            ]}
                        />
                    ))
                )}
            </Animated.View>

            <View style={styles.centerContent}>
                <Animated.View
                    style={[
                        styles.ring,
                        {
                            opacity: ring1Opacity,
                            transform: [{ scale: ring1Scale }],
                        },
                    ]}
                />
                <Animated.View
                    style={[
                        styles.ring,
                        {
                            opacity: ring2Opacity,
                            transform: [{ scale: ring2Scale }],
                        },
                    ]}
                />

                <Animated.View
                    style={[
                        styles.glow,
                        {
                            opacity: glowOpacity,
                            transform: [{ scale: glowScale }],
                        },
                    ]}
                />

                <Animated.View
                    style={[
                        styles.logoContainer,
                        {
                            opacity: logoOpacity,
                            transform: [
                                { scale: logoScale },
                                { rotate: spin },
                            ],
                        },
                    ]}
                >
                    <Image
                        source={require('../../assets/icon.jpeg')}
                        style={styles.logoImage}
                    />
                </Animated.View>

                <Animated.View
                    style={{
                        opacity: titleOpacity,
                        transform: [{ translateY: titleY }],
                        marginTop: 32,
                    }}
                >
                    <Animated.Text
                        style={[
                            styles.title,
                            { letterSpacing: titleLetterSpacing },
                        ]}
                    >
                        CURIEL
                    </Animated.Text>
                </Animated.View>

                <View style={styles.linesContainer}>
                    <Animated.View
                        style={[
                            styles.line,
                            styles.lineLeft,
                            {
                                opacity: lineOpacity,
                                transform: [{ translateX: lineLeftX }],
                            },
                        ]}
                    />
                    <Animated.View style={styles.lineDiamond}>
                        <Animated.View
                            style={[styles.diamond, { opacity: lineOpacity }]}
                        />
                    </Animated.View>
                    <Animated.View
                        style={[
                            styles.line,
                            styles.lineRight,
                            {
                                opacity: lineOpacity,
                                transform: [{ translateX: lineRightX }],
                            },
                        ]}
                    />
                </View>

                <Animated.Text
                    style={[
                        styles.subtitle,
                        {
                            opacity: subtitleOpacity,
                            transform: [{ translateY: subtitleY }],
                        },
                    ]}
                >
                    Inspecciones Tecnicas
                </Animated.Text>

                {mode === 'loading' && (
                    <Animated.View style={[styles.loadingDots, { opacity: subtitleOpacity }]}>
                        <View style={[styles.loadingDot, styles.loadingDot1]} />
                        <View style={[styles.loadingDot, styles.loadingDot2]} />
                        <View style={[styles.loadingDot, styles.loadingDot3]} />
                    </Animated.View>
                )}
            </View>

            <Animated.View style={[styles.bottomInfo, { opacity: subtitleOpacity }]}>
                <Text style={styles.version}>v1.0.0</Text>
            </Animated.View>
        </Animated.View>
    );
};

export const VideoSplashScreen = (props) => <LoadingSplash {...props} mode="splash" />;
export const LoadingScreen = (props) => <LoadingSplash {...props} mode="loading" />;
export default LoadingSplash;

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: CURIEL_BLUE,
        zIndex: 9999,
    },
    bgImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    gradientOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(26, 35, 126, 0.65)',
    },
    dotGrid: {
        ...StyleSheet.absoluteFillObject,
    },
    dot: {
        position: 'absolute',
        width: 2,
        height: 2,
        borderRadius: 1,
        backgroundColor: '#fff',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ring: {
        position: 'absolute',
        width: 130,
        height: 130,
        borderRadius: 65,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.25)',
    },
    glow: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: GLOW_COLOR,
    },
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.35)',
    },
    title: {
        fontSize: 32,
        fontWeight: '200',
        color: '#fff',
        letterSpacing: 14,
    },
    linesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
        marginBottom: 14,
        width: width * 0.5,
        justifyContent: 'center',
    },
    line: {
        height: 0.5,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        flex: 1,
    },
    lineLeft: { marginRight: 10 },
    lineRight: { marginLeft: 10 },
    lineDiamond: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    diamond: {
        width: 6,
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        transform: [{ rotate: '45deg' }],
    },
    subtitle: {
        fontSize: 13,
        fontWeight: '400',
        color: 'rgba(255, 255, 255, 0.75)',
        letterSpacing: 4,
        textTransform: 'uppercase',
    },
    loadingDots: {
        flexDirection: 'row',
        marginTop: 24,
        gap: 6,
    },
    loadingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    loadingDot1: { opacity: 1 },
    loadingDot2: { opacity: 0.6 },
    loadingDot3: { opacity: 0.3 },
    bottomInfo: {
        position: 'absolute',
        bottom: 60,
        alignSelf: 'center',
    },
    version: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.3)',
        letterSpacing: 2,
    },
});
