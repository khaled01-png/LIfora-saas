from pydantic import BaseModel

class StatsData(BaseModel):
    totalDonors: int
    activeDonors: int
    recentlyDonatedDonors: int
    activeRequests: int
    successfulDonations: int
    fulfilledRequests: int
    successRate: float
    totalCenters: int
    totalAvailableUnits: int
    totalResponses: int
    livesSaved: int

class StatsResponse(BaseModel):
    stats: StatsData
