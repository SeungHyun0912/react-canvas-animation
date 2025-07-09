import { useRef, useEffect, useState, useCallback } from 'react';
import '../styles/Canvas.css';

type DrawingMode = 'straight' | 'wavy';

interface CanvasProps {
    width?: number;
    height?: number;
    backgroundColor?: string;
}

const Canvas: React.FC<CanvasProps> = ( {
    width = 800,
    height = 600,
    backgroundColor = '#ffffff'
} ) => {
    const canvasRef = useRef<HTMLCanvasElement | null>( null );
    const [ isDrawing, setIsDrawing ] = useState( false );
    const [ context, setContext ] = useState<CanvasRenderingContext2D | null>( null );
    const [ drawingMode, setDrawingMode ] = useState<DrawingMode>( 'straight' );
    const [ lastPoint, setLastPoint ] = useState<{ x: number; y: number } | null>( null );
    const [ wavyCounter, setWavyCounter ] = useState( 0 );
    
    // Helper function to draw the initial shapes with useCallback
    const drawInitialShapes = useCallback( ( ctx: CanvasRenderingContext2D | null = context ) => {
        if( !ctx ) return;
        
        // Draw a 20x20 square
        ctx.fillStyle = '#3498db';
        ctx.fillRect( 50, 50, 20, 20 );

        // Draw a wavy line
        ctx.beginPath();
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.moveTo( 100, 100 );
        
        // Create a wavy pattern
        for( let i = 0; i < 100; i++ ) {
            const x = 100 + i * 3;
            const y = 100 + Math.sin( i * 0.1 ) * 20;
            ctx.lineTo( x, y );
        }
        
        ctx.stroke();
    }, [ context ] );

    useEffect( () => {
        const canvas = canvasRef.current;
        if( !canvas ) return;

        const ctx = canvas.getContext( '2d' );
        if( !ctx ) return;

        // Set background color
        ctx.fillStyle = backgroundColor;
        ctx.fillRect( 0, 0, width, height );

        // Draw initial shapes
        drawInitialShapes( ctx );

        setContext( ctx );
    }, [ backgroundColor, height, width, drawInitialShapes ] );

    const startDrawing = ( e: React.MouseEvent<HTMLCanvasElement> ) => {
        if( !context ) return;
        
        const { offsetX, offsetY } = e.nativeEvent;
        context.beginPath();
        context.moveTo( offsetX, offsetY );
        setLastPoint( { x: offsetX, y: offsetY } );
        setIsDrawing( true );
        setWavyCounter( 0 );
    };

    const draw = ( e: React.MouseEvent<HTMLCanvasElement> ) => {
        if( !isDrawing || !context || !lastPoint ) return;
        
        const { offsetX, offsetY } = e.nativeEvent;
        
        if( drawingMode === 'straight' ) {
            // Draw straight line
            context.clearRect( 0, 0, width, height );
            // Redraw background
            context.fillStyle = backgroundColor;
            context.fillRect( 0, 0, width, height );
            // Redraw initial shapes
            drawInitialShapes();
            
            // Draw the current straight line
            context.beginPath();
            context.strokeStyle = '#000000';
            context.lineWidth = 2;
            context.moveTo( lastPoint.x, lastPoint.y );
            context.lineTo( offsetX, offsetY );
            context.stroke();
        } else {
            // Draw wavy line
            setWavyCounter( wavyCounter + 1 );
            
            // Calculate a point along the path with some sine wave variation
            const dx = offsetX - lastPoint.x;
            const dy = offsetY - lastPoint.y;
            const distance = Math.sqrt( dx * dx + dy * dy );
            
            if( distance > 5 ) { // Only add points when moved enough
                const angle = Math.atan2( dy, dx );
                const amplitude = 5; // Height of the wave
                const frequency = 0.1; // Frequency of the wave
                
                // Calculate the position with a sine wave offset perpendicular to the direction
                const waveOffset = Math.sin( wavyCounter * frequency ) * amplitude;
                const perpX = -Math.sin( angle ) * waveOffset;
                const perpY = Math.cos( angle ) * waveOffset;
                
                const newX = lastPoint.x + dx * 0.2; // Move a fraction toward the cursor
                const newY = lastPoint.y + dy * 0.2;
                
                context.lineTo( newX + perpX, newY + perpY );
                context.stroke();
                
                setLastPoint( { x: newX, y: newY } );
            }
        }
    };

    const stopDrawing = () => {
        if( !context ) return;
        
        if( drawingMode === 'wavy' ) {
            context.closePath();
        }
        setIsDrawing( false );
        setLastPoint( null );
    };
    
    const clearCanvas = () => {
        if( !context ) return;
        
        context.fillStyle = backgroundColor;
        context.fillRect( 0, 0, width, height );
        
        // Redraw initial shapes after clearing
        drawInitialShapes();
    };

    const toggleDrawingMode = () => {
        setDrawingMode( prevMode => prevMode === 'straight' ? 'wavy' : 'straight' );
    };

    return ( 
        <div className="canvas-container">
            <canvas
                ref={ canvasRef }
                width={ width }
                height={ height }
                onMouseDown={ startDrawing }
                onMouseMove={ draw }
                onMouseUp={ stopDrawing }
                onMouseLeave={ stopDrawing }
            />
            <div className="canvas-controls">
                <button onClick={ clearCanvas }>Clear Canvas</button>
                <button onClick={ toggleDrawingMode }>
                    Mode: {drawingMode === 'straight' ? 'Straight Line' : 'Wavy Line'}
                </button>
            </div>
        </div>
    );
};

export default Canvas;
