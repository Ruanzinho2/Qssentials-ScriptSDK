import {
    world,
    system,
    BlockPistonState
} from "@minecraft/server"

world.afterEvents.pistonActivate.subscribe( e => {
    let { isExpanding, piston } = e
    
    let beforeBlockLocations = (
        piston.getAttachedBlocksLocations?.() ||
        piston.getAttachedBlocks?.()
    )

    if (! beforeBlockLocations) 
        return console.warn( "Unable to get attached blocks" );

    let offsetVector = isExpanding 
        ? Vector.subtract( beforeBlockLocations[0], piston.block.location )
        : Vector.subtract( piston.block.location, beforeBlockLocations[0] ).normalized()
    
    beforeBlockLocations.forEach( beforeBlockLocation => {
        let afterBlockLocation = Vector.add( beforeBlockLocation, offsetVector )
        
        let tickCount = 1
        
        let endState = isExpanding ? BlockPistonState.Expanded : BlockPistonState.Retracted
        
        let runId = system.runInterval( () => {
            
            if (piston.state != endState) return;
            
            let block = piston.block.dimension.getBlock( afterBlockLocation )
        
            onPistonBlockMoved?.( { beforeBlockLocation, block, piston } )
            
            system.clearRun( runId )
            
        } )
        
    } )
    
} )

function onPistonBlockMoved (eventData) {
    const { piston, block, beforeBlockLocation } = eventData
    
    world.sendMessage( block.typeId + " got moved" )
}