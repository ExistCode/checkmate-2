'use client';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

type DottedSurfaceProps = Omit<React.ComponentProps<'div'>, 'ref'>;

export function DottedSurface({ className, ...props }: DottedSurfaceProps) {
	const { theme } = useTheme();

	const containerRef = useRef<HTMLDivElement>(null);
	const isAnimatingRef = useRef<boolean>(false);
	const animationIdRef = useRef<number | null>(null);
	const lastFrameTimeRef = useRef<number>(0);
	const watchdogIntervalRef = useRef<number | null>(null);
	const sceneRef = useRef<{
		scene: THREE.Scene;
		camera: THREE.PerspectiveCamera;
		renderer: THREE.WebGLRenderer;
		particles: THREE.Points[];
		animationId: number;
		count: number;
	} | null>(null);

	useEffect(() => {
		if (!containerRef.current) return;

		const SEPARATION = 150;
		const AMOUNTX = 40;
		const AMOUNTY = 60;

		// Scene setup
		const scene = new THREE.Scene();
		scene.fog = new THREE.Fog(0xffffff, 2000, 10000);

		const camera = new THREE.PerspectiveCamera(
			60,
			window.innerWidth / window.innerHeight,
			1,
			10000,
		);
		camera.position.set(0, 355, 1220);

		const renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: true,
		});
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setClearColor(scene.fog.color, 0);

		// Ensure we don't keep stale canvases on re-renders
		while (containerRef.current.firstChild) {
			containerRef.current.removeChild(containerRef.current.firstChild);
		}
		containerRef.current.appendChild(renderer.domElement);

		// Create particles
		const particles: THREE.Points[] = [];
		const positions: number[] = [];
		const colors: number[] = [];

		// Create geometry for all particles
		const geometry = new THREE.BufferGeometry();

		for (let ix = 0; ix < AMOUNTX; ix++) {
			for (let iy = 0; iy < AMOUNTY; iy++) {
				const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
				const y = 0; // Will be animated
				const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;

				positions.push(x, y, z);
				if (theme === 'dark') {
					colors.push(200, 200, 200);
				} else {
					colors.push(0, 0, 0);
				}
			}
		}

		geometry.setAttribute(
			'position',
			new THREE.Float32BufferAttribute(positions, 3),
		);
		geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

		// Create material
		const material = new THREE.PointsMaterial({
			size: 8,
			vertexColors: true,
			transparent: true,
			opacity: 0.8,
			sizeAttenuation: true,
		});

		// Create points object
		const points = new THREE.Points(geometry, material);
		scene.add(points);

		let count = 0;

		// Animation function
		const animate = () => {
			isAnimatingRef.current = true;
			animationIdRef.current = requestAnimationFrame(animate);
			lastFrameTimeRef.current = performance.now();

			const positionAttribute = geometry.attributes.position;
			const positions = positionAttribute.array as Float32Array;

			let i = 0;
			for (let ix = 0; ix < AMOUNTX; ix++) {
				for (let iy = 0; iy < AMOUNTY; iy++) {
					const index = i * 3;

					// Animate Y position with sine waves
					positions[index + 1] =
						Math.sin((ix + count) * 0.3) * 50 +
						Math.sin((iy + count) * 0.5) * 50;

					i++;
				}
			}

			positionAttribute.needsUpdate = true;

			// Update point sizes based on wave
			const customMaterial = material as THREE.PointsMaterial & {
				uniforms?: any;
			};
			if (!customMaterial.uniforms) {
				// For dynamic size changes, we'd need a custom shader
				// For now, keeping constant size for performance
			}

			renderer.render(scene, camera);
			count += 0.1;
		};

		// Handle window resize
		const handleResize = () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		};

		window.addEventListener('resize', handleResize);

		// Handle tab visibility: resume if stopped when tab becomes visible
		const handleVisibility = () => {
			if (document.visibilityState === 'visible' && !isAnimatingRef.current) {
				animate();
			}
		};
		document.addEventListener('visibilitychange', handleVisibility);

		// Handle WebGL context loss/restoration
		const canvas = renderer.domElement;
		const handleContextLost = (event: Event) => {
			// Prevent default so the context can be restored
			event.preventDefault();
			if (animationIdRef.current !== null) {
				cancelAnimationFrame(animationIdRef.current);
				animationIdRef.current = null;
			}
			isAnimatingRef.current = false;
		};
		const handleContextRestored = () => {
			if (!isAnimatingRef.current) {
				animate();
			}
		};
		canvas.addEventListener('webglcontextlost', handleContextLost, false);
		canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

		// Start animation (ensure clean state)
		isAnimatingRef.current = false;
		if (animationIdRef.current !== null) {
			cancelAnimationFrame(animationIdRef.current);
			animationIdRef.current = null;
		}
		animate();

		// Watchdog to auto-restart if frames stop for any reason
		const startWatchdog = () => {
			if (watchdogIntervalRef.current !== null) return;
			watchdogIntervalRef.current = window.setInterval(() => {
				const now = performance.now();
				const timeSinceLastFrame = now - lastFrameTimeRef.current;
				const gl = renderer.getContext();
				const contextLost = typeof (gl as any).isContextLost === 'function' && (gl as any).isContextLost();
				if (document.visibilityState === 'visible' && !contextLost) {
					if (!isAnimatingRef.current || animationIdRef.current === null || timeSinceLastFrame > 1200) {
						animate();
					}
				}
			}, 1500);
		};
		startWatchdog();

		// Store references
		sceneRef.current = {
			scene,
			camera,
			renderer,
			particles: [points],
			animationId: animationIdRef.current ?? 0,
			count,
		};

		// Cleanup function
		return () => {
			window.removeEventListener('resize', handleResize);
			document.removeEventListener('visibilitychange', handleVisibility);
			canvas.removeEventListener('webglcontextlost', handleContextLost, false);
			canvas.removeEventListener('webglcontextrestored', handleContextRestored, false);
			if (watchdogIntervalRef.current !== null) {
				clearInterval(watchdogIntervalRef.current);
				watchdogIntervalRef.current = null;
			}

			if (sceneRef.current) {
				if (animationIdRef.current !== null) {
					cancelAnimationFrame(animationIdRef.current);
					animationIdRef.current = null;
				}
				isAnimatingRef.current = false;

				// Clean up Three.js objects
				sceneRef.current.scene.traverse((object: THREE.Object3D) => {
					if (object instanceof THREE.Points) {
						object.geometry.dispose();
						if (Array.isArray(object.material)) {
							object.material.forEach((material: THREE.Material) => material.dispose());
						} else {
							(object.material as THREE.Material).dispose();
						}
					}
				});

				sceneRef.current.renderer.dispose();

				if (containerRef.current && sceneRef.current.renderer.domElement) {
					containerRef.current.removeChild(
						sceneRef.current.renderer.domElement,
					);
				}
			}
		};
	}, [theme]);

	return (
		<div
			ref={containerRef}
			className={cn('pointer-events-none fixed inset-0 -z-1', className)}
			{...props}
		/>
	);
}
