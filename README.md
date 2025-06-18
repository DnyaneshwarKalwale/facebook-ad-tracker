# Facebook Ad Tracker

A robust system for tracking and monitoring Facebook/Meta ads with efficient status checking mechanisms.

## How It Works

### Ad Status Tracking System

The system implements a sophisticated approach to track ad statuses efficiently while handling the limitations of Meta's Ad Library API.

#### Core Components

1. **Initial Ad Discovery**
   - System fetches all active ads for a page using cursor-based pagination
   - New ads are stored in the database with their current status and metadata
   - Each ad maintains:
     - `adArchiveId`: Unique identifier from Meta
     - `isActive`: Current active status
     - `lastSeen`: Timestamp of last confirmation
     - `endDate`: When the ad became inactive (if applicable)

2. **Status Checking Mechanism**

The system uses a two-tier approach for status checking:

##### Tier 1: Bulk Status Check
- Every 5 minutes, the system performs a complete scan of active ads
- Uses cursor-based pagination to fetch ALL currently active ads
- Creates a Set of active ad IDs for O(1) lookup performance
- Compares against our database records

##### Tier 2: Historical Tracking
- System maintains a history of when ads were last seen active
- If an ad isn't found in the active ads list:
  - It's marked as inactive
  - `endDate` is set to current timestamp
  - `isActive` flag is set to false

#### Optimization Strategies

1. **Efficient Data Structures**
   - Uses Set for O(1) lookup of active ads
   - Batched database operations for better performance
   - Cursor-based pagination to handle large datasets

2. **Rate Limiting & API Optimization**
   - 1-second delay between pagination requests
   - Processes ads in batches of 10 to avoid overwhelming the database
   - 30-minute cooldown period between full ad scans

3. **Status Change Detection**
   ```typescript
   // Example status change detection
   if (!isStillActive) {
     // Ad is no longer active
     await prisma.ad.update({
       where: { id: ad.id },
       data: {
         isActive: false,
         endDate: new Date(),
         lastSeen: new Date()
       }
     });
   }
   ```

### Handling Edge Cases

1. **New Ads**
   - System captures new ads during regular scans
   - New ads are added to database with active status

2. **Inactive Ads**
   - When an ad is not found in active list:
     - Marked as inactive
     - End date is recorded
     - Historical data is preserved

3. **Reactivated Ads**
   - If a previously inactive ad reappears:
     - Status is updated to active
     - End date is cleared
     - Last seen timestamp is updated

## System Limitations

1. **Meta API Constraints**
   - Can only fetch currently active ads
   - No direct API for inactive ad status
   - Rate limits and pagination restrictions

2. **Resource Considerations**
   - Database growth over time
   - API call frequency limitations
   - Processing overhead for large ad sets

## Best Practices

1. **Regular Maintenance**
   - Monitor database growth
   - Archive old inactive ads
   - Adjust scanning intervals based on needs

2. **Error Handling**
   - Graceful handling of API failures
   - Retry mechanisms for failed requests
   - Comprehensive error logging

## Monitoring

The system provides detailed logging:
```
[2024-XX-XX ...] Starting tracking process for page {pageId}
[2024-XX-XX ...] Current stats for page {pageName}:
- Total active ads: {count}
[2024-XX-XX ...] Completed processing: {newCount} new ads found
```

## Auto-Tracking Service

The system includes an auto-tracking service that:
- Runs every 15 minutes
- Processes all pages in parallel
- Provides real-time status updates
- Maintains tracking intervals
- Logs next scheduled check times

## Technical Requirements

- Node.js environment
- Prisma ORM
- PostgreSQL database
- Meta Marketing API access
